import { CognitoIdentityProviderClient, GetUserCommand } from "@aws-sdk/client-cognito-identity-provider";
const client = new CognitoIdentityProviderClient({});

export const handler = async (event) => {
    const input = {
        AccessToken: event.accessToken,
    };
    const command = new GetUserCommand(input);
    const response = await client.send(command);
    const username = response.Username;

    return response;
};
