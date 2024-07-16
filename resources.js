const {TokenCounter, Quota} = databases.gateway;
export class apigating extends Resource {
  QuotaMap = new Map();
  async get() {
    //get the id for this get
    let id = this.getId();

    //fetch the Quota entry for this token
    const quota = await Quota.get(id);
    if(!quota) {
      //if no quote we error out
      let error = new Error('access denied');
      error.statusCode = 403;
      throw error;
    }

    let key = [id]
    let now = new Date();

    let tokenTime = 0;
    //based on the quota timeInterval we calculate time part for now and also the timeToken will be used to set token expiration and how far back to search for the sliding window
    switch (quota.timeInterval) {
      case "second":
        now.setUTCMilliseconds(0);
        tokenTime = quota.timeIncrement * 1000;
        break;
      case "minute":
        now.setUTCSeconds(0, 0);
        tokenTime = quota.timeIncrement * 1000 * 60;
        break;
      case "hour":
        now.setUTCMinutes(0, 0, 0);
        tokenTime = quota.timeIncrement * 1000 * 60 * 60;
        break;
      case "day":
        now.setUTCHours(0, 0, 0, 0);
        tokenTime = quota.timeIncrement * 1000 * 60 * 60 * 24;
        break;
      case "month":
        now.setUTCDate(0);
        tokenTime = quota.timeIncrement * 1000 * 60 * 60 * 24 * 30;
        break;
      case "year":
        now.setUTCMonth(0, 0);
        tokenTime = quota.timeIncrement * 1000 * 60 * 60 * 24 * 365;
        break;
      default:
        break;
    }

    //get the current context
    let context = this.getContext();

    let past = now.getTime() - tokenTime;

    key.push(now.getTime());

    //search our past entries for the token
    let window = await TokenCounter.search([
     { attribute: 'token_time', comparator: 'between', value: [[id, past], key] }]);

    let sum = 0;
    for await (let entry of window ){
      sum += entry.counter;

      if(sum >= quota.limit) {
        //if we have exceeded the quota throw an error
        let error =  new Error('you shall not pass!');
        error.statusCode = 429;
        throw error;
      }
    }

    let token = await TokenCounter.get(key, context);

    if(!token) {
      //if the current time frame doesn't exist create it with the expiration
      token = {token_time: key, counter: 1};
      context.expiresAt = Date.now() + tokenTime * 1.5;
      await TokenCounter.put(token, context);

    } else {
      //increment the counter by 1
      await token.addTo('counter', 1, context);

    }
    return {
      token_time: id,
      counter: sum +1
    };
  }
}