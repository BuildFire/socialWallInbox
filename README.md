# Premium Social Wall inbox
This plugin will read from from appData that gets inserted in Premium Sociall Wall 2 plugin 

## Structure

    {
        "users": [
        {
            "id": String, // Buildfire user id
            "displayName": String, // Buildfire user displayName
            "imageUrl": String // Buildfire user imageUrl
        },
        {
            "id": String, // Buildfire user id
            "displayName": String, // Buildfire user displayName
            "imageUrl": String // Buildfire user imageUrl
        }
        ],
        "wallId": String, // Premium Social Wall 2 wall id - 64 characters where first 32 and last 32 are valid user id,
        "wallTitle": String, //PSW wall id title
        "lastMessage": {
            "text": String, // Text of last message sent,
            "createdAt": Date, // Time when last message was sent,
            "sender": String, // Buildfire user id of message sender,
            "isRead": Boolean
        },
        "navigationData": {
            "pluginId": String,
            "instanceId": String,
            "folderName": String
        },
        "_buildfire.index": {
            "number1": isActive,
            "date1": lastMessage.createdAt,
            "string1": wallId,
            "array1": [
                {
                    "string1": user[0].id
                },
                {
                    "string1": user[1].id
                }
            ],
            "text": user[1].displayName + "||" + user[1].displayName
        }
    }


### Notes
- Data will be inserted only on walls that are equal to 2 user ids concatenated. 
- Plugin keeps track of last message, sender and read status
- Plugin also remembers social wall instance where message was to created and uses that data when navigating away from inbox and into social wall

## Getting Started
Be sure to have the latest [BuildFire CLI](https://github.com/BuildFire/sdk-cli) installed in your system.
Fork this repository and work from your fork.

## Usage
Be sure to be in the plugin's folder while running the following commands:

* `$ npm install` - Install all plugin dependencies
* `$ npm start` - Runs the plugin in the [Plugin Tester](https://github.com/BuildFire/sdk/wiki/How-to-test-your-Plugin-locally)
* `$ npm run build` - Builds the plugin to be [submitted to the Marketplace](https://github.com/BuildFire/sdk/wiki/How-to-submit-your-plugin)




