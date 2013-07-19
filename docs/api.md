# API v2

# Introduction

This documentation describes the Open Badger API (OBr), version 2. Version 1 of the API was meant for the Webmaker project. This version of the API adds functionality to support the Chicago Summer of Learning 2013 [CSOL] and the Webmaker Summer Campaign 2013. However, it removes some of the version 1
functionality due to time constraints that caused us to abandon some of its
code. A future version 3 API will unite the APIs of the two previous versions.

# Security Model

The API can be used anonymously, or on behalf of the users of applications. When used on behalf of users, an API request must receive an `auth` parameter containing a [JSON Web Token][JWT], signed by a shared secret that the API host and the client have established beforehand.

Requests made on behalf of users must have the `prn` claim set to a string representing the relevant user's email address in the JWT.

## Example

Here's an example JWT Claims Set, issued by thimble.webmaker.org, that allows the token bearer to perform actions on badges.webmaker.org on behalf of foo@bar.org.

```json
{
  "iss": "https://thimble.webmaker.org",
  "aud": "https://badges.webmaker.org",
  "prn": "foo@bar.org",
  "exp": 1300819380
}
```

Note that the above object only represents a JWT Claims Set, and not a
full JWT; see [Example JWT][] in the JWT specification for a full example.

# Data Types

## Timestamps

Unless otherwise noted, all timestamps are JSON numeric values representing the number of seconds from 1970-01-01T0:0:0Z UTC until the specified UTC date/time. See [RFC 3339][] for details regarding date/times in general and UTC in particular.

## Shortnames

Many object types have a unique, administrator-defined *shortname* that is used to identify it. A shortname consists only of ASCII alphanumeric characters, underscores, and hyphens. They must also begin with a letter (not an underscore or digit). Semantically, it is similar to the concept of a slug, and the two terms can generally be used interchangeably.

## Badge Types

Many of the endpoints return information about badge types. Here's an example of a badge type JSON structure:

```json
{
  "name": "First Login",
  "description": "Like a champion, you logged in, vanquishing all privacy policies and terms of service in your path.",
  "criteria": "Can log into a site that uses Persona for authentication.",
  "image": "https://wiki.mozilla.org/images/b/bb/Merit-badge.png",
  "prerequisites": ["some-other-badge"],
  "program": {
    "shortname": "some-program",
    "name": "Some Program",
    "issuer": {
      "name": "Badge Authority",
      "url": "http://badgeauthority.org"
    },
    "url": "http://example.org/program",
    "imageUrl": "https://example.org/program/image/program"
  },
  "tags": ["13-18", "S", "T", "online"],
  "ageRange": ["0-13", "13-18"],
  "type": "skill",
  "activityType": "online",
  "rubric": {
    "items": [
      {
        "text": "learner can funnel like 80 beers",
        "required": true
      }
    ]
  }
}
```

`description` and `criteria` can contain HTML.

`prerequisites` is a list of badge shortnames that are required to earn the badge.

`program` contains metadata about the program the badge belongs to.

`tags` is a list of the badge's tags.

`ageRange` is a list containing any of `0-13`, `13-18`, and `19-24`.

`type` is one of `skill`, `achievement`, or `participation`.

`activityType` is one of `online` or `offline`.

`rubric` is the badge's evaluation rubric, if one has been defined. It is
comprised of `items`, which is an array of rubric items that each
contain the following keys:

* `text` is the plain text of the rubric.
* `required` is a boolean indicating whether the rubric *must* be satisfied for the learner to earn the badge.

### STEAM Badge Properties

Badges that are part of a STEAM (Science, Technology, Engineering, Arts, and Math) categorization may have additional properties.

If the badge is a STEAM badge, it will have the following properties:

* `categoryAward` is the name of a lower-cased STEAM category for which the badge is an award. If the badge is not a STEAM badge, then this field will be empty or undefined.

* `categoryRequirement` is the number of points needed to earn the badge, if it's a STEAM badge. If it's not a STEAM badge, then it's 0 or undefined.

If the badge is not a STEAM badge, but can be used to earn them, it will have the following properties:

* `categories` is an array of the lower-cased STEAM categories for which this badge can be used towards earning a STEAM badge for. This is only valid for non-STEAM badges; otherwise it's empty or undefined.

* `categoryWeight` is the number of points that the badge contributes to earning a STEAM badge of its category/categories. This is only valid for non-STEAM badges; otherwise it's 0 or undefined.

# Endpoints

## GET `/v2/badges`
Get information about all existing badge classes.

This is needed by applications to show information about available badges to users. It requires no authorization.

### Request Parameters
* **search**: (Optional) Filter out badges whose name isn't like the given string. "Likeness" is determined by generating a case-insensitive, unbounded regexp (i.e., `new Regexp(searchTerm, 'i')`).


### Example
This endpoint returns `200 OK`:

```json
{
  "status": "ok",
  "badges": {
    "first-login": {
      "name": "First Login",
      "description": "Like a champion, you logged in, vanquishing all privacy policies and terms of service in your path.",
      "criteria": "Can log into a site that uses Persona for authentication.",
      "image": "https://wiki.mozilla.org/images/b/bb/Merit-badge.png",
      "prerequisites": ["some-other-badge"],
      "program": "some-program",
      "tags": ["13-18", "S", "T", "online"],
      "rubric": {
        "items": [
          {
            "text": "learner can funnel like 80 beers",
            "required": true
          }
        ]
      }
    },
    ...
  }
}
```

The badge type object is documented above.

## GET `/v2/badge/<shortname>`
Get information about a single badge.

### Example
This endpoint returns `200 OK`:

```json
{
  "status": "ok",
  "badge": {
    "name": "First Login",
    "description": "Like a champion, you logged in, vanquishing all privacy policies and terms of service in your path.",
    "criteria": "Can log into a site that uses Persona for authentication.",
    "image": "https://wiki.mozilla.org/images/b/bb/Merit-badge.png",
    "prerequisites": ["some-other-badge"],
    "program": {
      "shortname": "some-program",
      "name": "Some Program",
      "issuer": {
        "name": "Badge Authority",
        "url": "http://badgeauthority.org"
      },
      "url": "http://example.org/program",
      "imageUrl": "https://example.org/program/image/program"
    },
    "tags": ["13-18", "S", "T", "online"],
    "rubric": {
      "items": [
        {
          "text": "learner can funnel like 80 beers",
          "required": true
        }
      ]
    }
  }
}
```

Same data as above, for a single badge.

## GET `/v2/user`
Get information on a user's badge information.

This is needed by applications to display information about earned badges to users. Requires user authorization; users other than `email` cannot access this endpoint.

### Parameters
* **auth**: The JWT corresponding to the user making the request.
* **email**: The email of the relevant user.

### Example
This endpoint returns `200 OK`:

```json
{
  "status": "ok",
  "badges": {
    "first-login": {
      "issuedOn": 1344816000,
      "assertionUrl": "https://clopenbadger.webmaker.org/afjeo23",
      "isRead": false,
      "badgeClass": {
        "name": "First Login",
        "image": "/badge/image/first-login.png",
        "description": "Yay you logged in."
      }
    }
  }
}
```

## POST `/v2/user/mark-all-badges-as-read`
Mark all badges as read.

This is needed by applications. Requires user authorization; users other than `email` cannot access this endpoint.

### Parameters
* **auth**: The JWT corresponding to the user making the request.
* **email**: The email of the relevant user.

### Examples

This endpoint returns `200 OK`:

```json
{"status": "ok"}
```

## GET `/v2/user/badge/<shortname>`
Get detailed information about a user's badge.

### Parameters
* **auth**: The JWT corresponding to the user making the request.
* **email**: The email of the relevant user.

### Example
This endpoint returns `200 OK`:

```json
{
  "status": "ok",
  "badge": {
    "isRead": true,
    "issuedOn": 1370001406,
    "assertionUrl": "/badge/assertion/43e22fa0f2b6d8ca1c06867010ccd36f8402640a",
    "evidence": "http://csol.iremix.cc/medal/97445/evidence.html?1374160995",
    "badgeClass": {
      "name": "Link Badge, basic",
      "description": "For doing links.",
      "prerequisites": [],
      "image": "/badge/image/link-basic.png",
      "program": {
        "shortname": "some-program",
        "name": "Some Program",
        "issuer": {
          "name": "Badge Authority",
          "url": "http://badgeauthority.org"
        },
        "url": "http://example.org/program",
        "imageUrl": "https://example.org/program/image/program"
      },
      "tags": [
        "linking",
        "webdev"
      ],
      "categories": [],
      "ageRange": [],
      "rubric": {
        "items": []
      }
    }
  }
}
```

## POST `/v2/user/badge/<shortname>`
Award a badge directly to a user.

### Request Parameters
* **auth**: The JWT corresponding to the user making the request.
* **email**: The email of the relevant user.
* **evidence**: A URL pointing to evidence for the badge.


### Response Codes
* `201 Created`: New badge was awarded.
* `400 Bad Request`: Missing or invalid parameters.
* `409 Conflict`: User already has the badge.


### Response Parameters
* **status**: Status of the request. If the request is good, contains with the literal string `"ok"`. If the request is bad for any reason, contains the literal string `"error"`.
* **url**: URL for the badge assertion.
* **autoAwardedBadges**: An array containing shortnames of all additional badges awarded as a result of this action.



## GET `/v2/badge/<shortname>/claimcodes`
Get a list of claim codes for a specific badge class.

### Request Parameters
* **auth**: The JWT corresponding to the user making the request.
* **count** (optional): How many claim codes to retrieve. Defaults to 100. Set to 0 for unlimited.
* **page** (optional): Which page of results to retrieve. Note, this parameter only makes sense if **count** is set to a number lower than the total amount of claim codes. Defaults to 1.
* **unclaimed** (optional): If set to true, will only show unclaimed badges. Defaults to false.

### Response Codes
* `200 OK`: Everything's OK, claim codes should be returned.
* `404 Not Found`: Could not find a badge with that shortname.
* `400 Bad Request`: Missing or invalid parameters.

### Response Parameters
* **status**: Status of the request. If the request is good, contains with the literal string `"ok"`. If the request is bad for any reason, contains the literal string `"error"`.
* **claimUrl**: URL where a user can go to use the claim codes.
* **claimcodes**: Array of objects with the following properties:
  * **code**: The claim code
  * **claimed**: Boolean for whether it's claimed or not
  * **reservedFor**: Which email address the code is reserved for, if any


## POST `/v2/badge/<shortname>/claimcodes`
Create new claimcodes for a badge.

### Request Parameters
* **claimcodes**: Array of claimcodes to add for a badge. Note that claimcodes must be universally unique across all badge classes, are not case sensitive, and any spaces in the name will be replaced with hypens.
* **strict** (optional): Boolean, don't allow for partial acceptance (if any claimcode is rejected, reject the whole batch).

### Response Codes
* `201 Created`: All claimcodes were successfully created.
* `202 Accepted`: Some claimcodes were accepted, but there was a problem accepting some others (likely due to a name conflict, as claimcodes must be universally unique). This will never be returned if `strict` is set to true.
* `400 Bad Request`: Missing or invalid parameters.
* `409 Conflict`: All of the claimcodes were rejected due to conflict.

### Response Parameters
* **status**: Status of the request. If the request is good, contains with the literal string `"ok"`. If some codes were accepted and others were rejected, the status will be `"mixed"`. If the request was totally bad for any reason, will return `"error"`.
* **claimUrl**: URL where a user can go to use the claim codes.
* **accepted**: Array of accepted codes.
* **rejected**: Array of rejected codes.

## POST `/v2/badge/<shortname>/claimcodes/random`
Create a random set of claimcodes for a badge. Claims will be in the form of `"<adverb>-<adjective>-<noun>"`.

### Request Parameters
* **count**: How many codes to generate. Maximum of 200.

### Response Codes
* `201 Created`: Claimcodes were created.
* `400 Bad Request`: Missing or invalid parameters.

### Response Parameters
* **status**: Status of the request. If the request is good, contains with the literal string `"ok"`. If the request was totally bad for any reason, will return `"error"`.
* **claimUrl**: URL where a user can go to use the claim codes.
* **accepted**: Array of accepted codes.
* **rejected**: Will be an empty array.

## GET `/v2/unclaimed`
Get information about an unclaimed badge.

### Request Parameters
* **code**: The claimcode of the badge.

### Response Codes
* `200`: Returns an object with `status` set to `ok` and `badge` set to an object containing information about the badge for the claim code. See the documentation of `/v2/badge/<shortname>` for an example of this object. Additionally, `reservedFor` will be the email the claim code is reserved for, if any, and `evidenceItems` is the number of reserved evidence items the claim code has.
* `409`: Claim code has already been used.
* `404`: Unknown claim code.
* `400 Bad Request`: Missing or invalid parameters.

## GET `/v2/unclaimed/evidence`
Return an evidence item of an unclaimed claim code.

### Request Parameters
* **code**: The unclaimed claimcode.
* **n**: The evidence item number to retrieve. 0 is the first evidence item, 1 is the second, and so on.

### Response Codes
* `200`: Returns the evidence data with the appropriate mime type set.
* `404`: Unknown claim code or evidence item number.
* `400 Bad Request`: Missing or invalid parameters.

## POST `/v2/claim`
Claim a badge via claim code.

Note that this will destroy any temporary evidence associated with it, so be sure to retrieve it if needed beforehand.

### Request Parameters
* **email**: The email address of the user to award the badge to.
* **code**: The claimcode of the badge to be awarded.

### Response Codes
* `200`: Badge awarded. Returns an object with `status` set to `ok` and `url` set to the URL of the new badge's assertion.
* `409`: Claim code has already been used.
* `404`: Unknown claim code.
* `400 Bad Request`: Missing or invalid parameters.
* `409`: User already has the badge.

### Response Parameters
* **status**: Status of the request. If the request is good, contains with the literal string `"ok"`. If the request is bad for any reason, contains the literal string `"error"`.
* **url**: URL for the badge assertion.
* **autoAwardedBadges**: An array containing shortnames of all additional badges awarded as a result of this action.

## GET `/v2/user/recommendations`
Get a list of recommended badges for a user.

### Request Parameters
* **email**: (Optional) Email address for a user. If not passed, will use the email address specified in the authentication token.
* **limit**: Limit the amount of badges returned by the API. Defaults to `10`, pass in `0` for unlimited.
* **ageRange**: Age range of the user. Valid options are `0-13`, `13-18`, and `19-24`

### Response Parameters
* **status**: Status of the request. If the request is good, contains with the literal string `"ok"`. If the request is bad for any reason, contains the literal string `"error"`.

* **badges**: Array of badge objects. Properties for each object are:
   * **name**
   * **description**
   * **prerequisites**
   * **image**
   * **criteria**
   * **tags**
   * **categoryAward**
   * **categoryRequirement**
   * **categoryWeight**
   * **categories**
   * **ageRange**
   * **type**
   * **activityType**
   * **rubric**
   * **program**

## GET `/v2/badge/:shortname/recommendations`
Get a list of recommended "next badges" based on the categories of another badge.

### Request Parameters
* **limit**: Limit the amount of badges returned by the API. Defaults to `10`, pass in `0` for unlimited.
* **email**: (Optional) Email address for a user, will filter out any badges already earned by the user.

### Response Parameters
* **status**: Status of the request. If the request is good, contains with the literal string `"ok"`. If the request is bad for any reason, contains the literal string `"error"`.

* **badges**: Array of badge objects. Properties for each object are:
   * **name**
   * **description**
   * **prerequisites**
   * **image**
   * **criteria**
   * **tags**
   * **categoryAward**
   * **categoryRequirement**
   * **categoryWeight**
   * **categories**
   * **ageRange**
   * **type**
   * **activityType**
   * **rubric**
   * **program**

## GET `/v2/issuers`
Get information about all existing issuers.

This is needed by the CSOL About page to show the organizations involved in the Chicago Summer of Learning.

### Example
```javascript
{
  "status": "ok",
  "issuers": {
    "some-chicago": { "name": "Some Chicago Org", "url": "www.somechicago.org" },
    "another-chicago": { "name": "Another Org", "url": "www.another.org" }
  }
}
```

## GET `/v2/programs`
Get information about all existing programs.

### Request Parameters
All request parameters are optional.

* **search**: Filter out programs whose name isn't like the given string. "Likeness" is determined by generating a case-insensitive, unbounded regexp (i.e., `new Regexp(searchTerm, 'i')`).
* **org**: Valid inputs are issuer shortnames.
* **category**: Category, generally one of "science", "technology", "engineering", "arts" or "math".
* **age**: Valid age ranges: "0-13", "13-18", "19-24".
* **activity**: Either "offline" or "online"


### Example
```javascript
{
  "status": "ok",
  "programs": [
    {
      "shortname": "prog-a",
      "image": "http://some.org/program/image",
      "name": "My Program",
    },
    ...
  ]
}
```

## GET `/v2/program/<shortname>`
Get information about a single program.

### Example
```javascript
{
  "status": "ok",
  "program": {
    "issuer": {
      "name": "Some Org",
      "url": "http://some.org"
    },
    "image": "http://some.org/program/image",
    "name": "My Program",
    "description": "In my program you do stuff.",
    "date": 1344816000,
    "url": "http://some.org/program.html"
    "earnableBadges": {
      "foo-badge": {
        "name": "Foo Badge",
        "image": "http://some.org/program/foo-badge.png"
      },
      ...
    }
  }
}
```

  [JWT]: http://tools.ietf.org/html/draft-ietf-oauth-json-web-token-03
  [RFC 3339]: http://tools.ietf.org/html/rfc3339
  [Example JWT]: http://tools.ietf.org/id/draft-ietf-oauth-json-web-token-03.html#rfc.section.3.1
  [CSOL]: http://chicagosummeroflearning.org
  [machine tags]: http://tagaholic.me/2009/03/26/what-are-machine-tags.html
