import { DynamoDB } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocument } from '@aws-sdk/lib-dynamodb';
import { CognitoIdentityProviderClient, GetUserCommand } from "@aws-sdk/client-cognito-identity-provider";

const client = new CognitoIdentityProviderClient({});
const dynamo = DynamoDBDocument.from(new DynamoDB());

export const handler = async (event) => {
    let body;
    let statusCode = '200';
    const subscription = event.item;

    try {
        switch (event.httpMethod) {
            case 'GET':
                body = await dynamo.get({
                    TableName: process.env.db_name,
                    Key: {
                        'subscription_id': subscription.subscription_id,
                        'email': subscription.email
                    }
                });
                break;
            case 'POST':
                body = await dynamo.put({
                    TableName: process.env.db_name,
                    Item:{...subscription}
                });
                break;
            case 'DELETE':
                body = await dynamo.delete({
                    TableName: process.env.db_name,
                    Key: {
                        'subscription_id': subscription.subscription_id,
                        'email': subscription.email
                    }
                });
                break;
            case 'PUT':
                body = await dynamo.put({
                    TableName: process.env.db_name,
                    Item:{...subscription}
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
