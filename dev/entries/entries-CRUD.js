import { DynamoDB } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocument } from '@aws-sdk/lib-dynamodb';
import { CognitoIdentityProviderClient, GetUserCommand } from "@aws-sdk/client-cognito-identity-provider";

const client = new CognitoIdentityProviderClient({});
const dynamo = DynamoDBDocument.from(new DynamoDB());

export const handler = async (event) => {

    let body;
    let statusCode = '200';
    const entry = event.item;

    const token = getToken(event);
    const user = await getUser(token);

    try {
        if(user.Username !== entry.pen_name){
            throw new Error("Do not have access to this resource");
        }

        switch (event.httpMethod) {
            case 'GET':
                body = await dynamo.get({
                    TableName: process.env.db_name,
                    Key: {
                        'entry_id': entry.entry_id,
                    }
                });
                break;
            case 'POST':
                body = await dynamo.put({
                    TableName: process.env.db_name,
                    Item:{...entry}
                });
                break;
            case 'DELETE':
                body = await dynamo.delete({
                    TableName: process.env.db_name,
                    Key: {
                        'entry_id': entry.entry_id,
                        'pen_name': user.Username
                    }
                });
                break;
            case 'PUT':
                body = await dynamo.update({
                    TableName: process.env.db_name,
                    Key: {
                        'entry_id': entry.entry_id,
                        'pen_name': user.Username
                    },
                    UpdateExpression: 'SET #title :title, #html :html, #raw :raw',
                    ExpressionAttributeNames: {
                        '#title': 'title',
                        '#html': 'html',
                        '#raw': 'raw',
                    },
                    ExpressionAttributeValues: {
                        ':title': entry.title,
                        ':html': entry.html,
                        ':raw': entry.raw
                    },
                });
                break;
            default:
                throw new Error(`Unsupported method "${event.httpMethod}"`);
        }
    } catch (err) {
        statusCode = '400';
        body = err.message;
    } finally {
        body = JSON.stringify(body);
    }

        return {
        statusCode,
        body,
        headers: {
            "Access-Control-Allow-Headers" : "Content-Type",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "OPTIONS,POST,PUT,DELETE",
            "Content-Type": "application/json"
        }
    };
};

async function getUser(accessToken) {
    const input = {
        AccessToken: accessToken,
    };
    const command = new GetUserCommand(input);
    const response = await client.send(command);

    return response;
};

function getToken(event) {
    let token;
    if (event.headers && event.headers.accesstoken && event.headers.accesstoken != "") {
        token = event.headers.accesstoken;
    }else if (event.multiValueHeaders && event.multiValueHeaders.accesstoken && event.multiValueHeaders.accesstoken != "") {
        token = event.multiValueHeaders.accesstoken;
    }
    return token;
}