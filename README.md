# API Gating Example
This repo gives example data model and logic showing how to leverage HarperDB's atomic counters to rate limit requests over a defined sliding window.

## API
### /apigating
This component provides the `/apigating` endpoint to GET against, passing a token. Based on the `Quota` for the token, the sliding window will be calculated. If the token is below its limit a `200` status code will be returned.  If the token exceeds its limit a `429` status code will be returned.

Endpoint:
`GET /apigating/{token}`

Sample Call: `GET /apigating/abc123`

### /quota
The `Quota` table is exported via [REST](https://docs.harperdb.io/docs/developers/rest) to allow for PUT, DELETE, GET, etc... of `Quota` record(s).

The base endpoint to interact with `Quota` is `/quota`

## Data Model
### Quota Table
The `Quota` table defines limits applied to a token, for example if token 'abc123' needs to limit 1000 requests for a 15 minute window the sample record looks like:
```json
{
    "token": "abc123",
    "limit": 1000,
    "timeInterval": "minute",
    "timeIncrement": 5
}
```
**Attributes:**

| Name    |Description| Primary Key | Data Type | Required
|---------|---|------|---|---|
| `token` |token to apply a quota to| &#x2611;     | String | &#x2611; 
| `limit` |limit of requests over the defined time period|    | Int | &#x2611; 
| `timeInterval` |the interval of time for this quota (eg. second, minute, hour, day, etc...)|    | Int |&#x2611; 
| `timeIncrement` |increment of time for the timeInterval|    | String |&#x2611; 

### TokenCounter Table
The `TokenCounter` table stores interval counts for a taken and is used to evaluate limits over a sliding window
**Attributes:**

| Name            |Description| Primary Key | Data Type | Required
|-----------------|---|------|---|---
| `token_time`    |multi-part Array that stores the token at index 0 and the epoch time for the interval at index 1| &#x2611;     | Array | &#x2611; 
| `counter`       |count of requests for the key's interval|    | Long | &#x2611; 
