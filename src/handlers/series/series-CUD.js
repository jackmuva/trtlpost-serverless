import { DynamoDB } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocument } from '@aws-sdk/lib-dynamodb';
import { CognitoIdentityProviderClient, GetUserCommand } from "@aws-sdk/client-cognito-identity-provider";

const client = new CognitoIdentityProviderClient({});
const dynamo = DynamoDBDocument.from(new DynamoDB());

export const handler = async (event) => {
    let body;
    let statusCode = '200';
    const series = event.item;

    const token = getToken(event);
    const user = await getUser(token);

    try {
        if(user.Username !== series.pen_name){
            throw new Error("Do not have access to this resource");
        }
        switch (event.httpMethod) {
            case 'POST':
                body = await dynamo.put({
                    TableName: process.env.db_name,
                    Item:{...series}
                });
                break;
            case 'DELETE':
                body = await dynamo.delete({
                    TableName: process.env.db_name,
                    Key: {
                        'series_id': series.series_id,
                        'pen_name': user.Username
                    }
                });
                break;
            case 'PUT':
                body = await dynamo.update({
                    TableName: process.env.db_name,
                    Key: {
                        'series_id': series.series_id,
                        'pen_name': user.Username
                    },
                    UpdateExpression: 'SET #cadence =:cadence, #summary =:summary, #title =:title, #published =:published, #tags =:tags, #num_entries =:num_entries',
                    ExpressionAttributeNames: {
                        '#cadence': 'cadence',
                        '#summary': 'summary',
                        '#title': 'title',
                        '#published': 'published',
                        '#tags': 'tags',
                        '#num_entries': 'num_entries'
                    },
                    ExpressionAttributeValues: {
                        ':cadence': series.cadence,
                        ':summary': series.summary,
                        ':title': series.title,
                        ':published': series.published,
                        ':tags': series.tags,
                        ':num_entries': series.num_entries,
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