// Require the Bolt package (github.com/slackapi/bolt)
const { App } = require("@slack/bolt");

const app = new App({
    token: process.env.SLACK_BOT_TOKEN,
    appToken: process.env.SLACK_APP_TOKEN,
    socketMode: true,
});

// All the room in the world for your code
app.command("/review", async ({ ack, body, client, logger }) => {
    // Acknowledge the command request
    await ack();

    try {
        // Call views.open with the built-in client
        const result = await client.views.open({
            // Pass a valid trigger_id within 3 seconds of receiving it
            trigger_id: body.trigger_id,
            // View payload
            view: {
                title: {
                    type: "plain_text",
                    text: "Request a code review",
                    emoji: true,
                },
                submit: {
                    type: "plain_text",
                    text: "Submit",
                },
                type: "modal",
                callback_id: "view-code-review-request",
                close: {
                    type: "plain_text",
                    text: "Cancel",
                },
                blocks: [
                    {
                        type: "section",
                        text: {
                            type: "mrkdwn",
                            text: "_Use this window to post a code review request to the channel, tagging the necessary reviewers to notify them of the proposed changes in your Swarm._",
                        },
                    },
                    {
                        type: "input",
                        block_id: "block-bugstar-id",
                        optional: true,
                        element: {
                            type: "plain_text_input",
                            action_id: "input-bugstar-id",
                            focus_on_load: true,
                            placeholder: {
                                type: "plain_text",
                                text: "bugstar://654321",
                            },
                        },
                        label: {
                            type: "plain_text",
                            text: "Bugstar",
                        },
                    },
                    {
                        type: "input",
                        block_id: "block-swarm-url",
                        element: {
                            type: "url_text_input",
                            action_id: "input-swarm-url",
                            placeholder: {
                                type: "plain_text",
                                text: "Enter Swarm URL",
                            },
                        },
                        label: {
                            type: "plain_text",
                            text: "Swarm URL",
                        },
                    },
                    {
                        type: "section",
                        block_id: "block-requested-reviewers",
                        text: {
                            type: "mrkdwn",
                            text: "*Reviewers*",
                        },
                        accessory: {
                            action_id: "input-requested-reviewers",
                            type: "multi_users_select",
                            placeholder: {
                                type: "plain_text",
                                text: "@NikoBellic...",
                            },
                        },
                    },
                    {
                        type: "input",
                        block_id: "block-comments-messages",
                        optional: true,
                        element: {
                            type: "plain_text_input",
                            multiline: true,
                            action_id: "input-comments-messages",
                            placeholder: {
                                type: "plain_text",
                                text: "Write a small message to reviewers",
                            },
                        },
                        label: {
                            type: "plain_text",
                            text: "Comments",
                        },
                    },
                    {
                        type: "actions",
                        block_id: "block-posting-channel",
                        elements: [
                            {
                                type: "conversations_select",
                                default_to_current_conversation: true,
                                placeholder: {
                                    type: "plain_text",
                                    text: "Select channel",
                                    emoji: true,
                                },
                                action_id: "action-posting-channel",
                            },
                        ],
                    },
                ],
            },
        });
        logger.info(result);
    } catch (error) {
        logger.error(error);
    }
});

// Your listener function will be called every time an interactive component with the action_id "approve_button" is triggered
app.action("input-requested-reviewers", async ({ ack }) => {
    await ack();
    // Update the message to reflect the action
});

// Your listener function will be called every time an interactive component with the action_id "approve_button" is triggered
app.action("action-posting-channel", async ({ ack }) => {
    await ack();
    // Update the message to reflect the action
});

// Your listener function will be called every time an interactive component with the action_id "approve_button" is triggered
app.action("action-upvote-review", async ({ body, client, ack, logger }) => {
    await ack();

    const userId = body.user.id;
    const messageId = body.message.ts;
    const channelId = body.channel.id;

    try {
        await client.chat.postMessage({
            channel: channelId,
            thread_ts: messageId,
            text: `<@${userId}> just upvoted!  :upvote:`,
        });
    } catch (error) {
        logger.error(error);
    }
});

// Your listener function will be called every time an interactive component with the action_id "approve_button" is triggered
app.action("action-bump-message", async ({ body, client, ack, logger }) => {
    await ack();

    logger.info(body);

    const messageId = body.container.message_ts;
    const channelId = body.container.channel_id;

    try {
        await client.chat.postMessage({
            channel: channelId,
            thread_ts: messageId,
            text: "*Bump.*  :eyes:",
        });
    } catch (error) {
        logger.error(error);
    }
});

// Handle a view_submission request
app.view(
    "view-code-review-request",
    async ({ ack, body, view, client, logger }) => {
        // Acknowledge the view_submission request
        await ack();

        //Get form input data
        const userId = body.user.id;
        const bugstar =
            view["state"]["values"]["block-bugstar-id"]["input-bugstar-id"]["value"];
        const swarm =
            view["state"]["values"]["block-swarm-url"]["input-swarm-url"]["value"];
        const reviewers =
            view["state"]["values"]["block-requested-reviewers"][
            "input-requested-reviewers"
            ];
        const comment =
            view["state"]["values"]["block-comments-messages"][
            "input-comments-messages"
            ]["value"];
        const channel =
            view["state"]["values"]["block-posting-channel"][
            "action-posting-channel"
            ]["selected_conversation"];

        var reviewersTagged = reviewers.selected_users
            .map((reviewerId) => `<@${reviewerId}>`)
            .join(", ");


        // Compose message to send to channel
        let swarmPattern = /https:\/\/(.+)?swarm.+.com\/reviews\/(\d+)(\/)?/;
        let matches = swarm.match(swarmPattern);
        let itemForReview = swarmPattern.test(swarm) ? `*swarm* <${swarm}|${matches[2]}>` : `*item*\n>${swarm}`;

        let message = [
            {
                type: "section",
                text: {
                    type: "mrkdwn",
                    text: `> *<@${userId}> has requested a review for* ${itemForReview}`,
                },
            },
            {
                type: "section",
                fields: [
                    {
                        type: "mrkdwn",
                        text: `*Comments*\n ${comment || "Thanks!  :rocket:"}`,
                    },
                    {
                        type: "mrkdwn",
                        text: `*Bug* :bug_star:\n${bugstar || " "}`,
                    },
                ],
            },
            {
                type: "section",
                text: {
                    type: "mrkdwn",
                    text: `*Reviewers*\n${reviewersTagged || " "}`,
                },
            },
            {
                type: "actions",
                elements: [
                    {
                        type: "overflow",
                        options: [
                            {
                                text: {
                                    type: "plain_text",
                                    text: ":bell:  Nudge",
                                    emoji: true,
                                },
                            },
                        ],
                        action_id: "action-bump-message",
                    },
                    {
                        type: "button",
                        text: {
                            type: "plain_text",
                            emoji: true,
                            text: ":thumbsup:  Upvote",
                        },
                        action_id: "action-upvote-review",
                    },
                ],
            },
        ];

        try {
            var postMessageResponse = await client.chat.postMessage({
                channel: channel,
                blocks: message,
            });

            var messageTimestamp = postMessageResponse.ts;

            await client.pins.add({
                channel: channel,
                timestamp: messageTimestamp,
            });
        } catch (error) {
            logger.error(error);
        }
    }
);

(async () => {
    // Start your app
    await app.start();

    console.log("Code Review app is running!");
})();
