import dotenv from 'dotenv';
dotenv.config();

import bolt from '@slack/bolt';
const { App, LogLevel } = bolt;

import Airtable from 'airtable';
const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(process.env.AIRTABLE_BASE_ID);

const app = new bolt.App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  logLevel: bolt.LogLevel.DEBUG,
});

// This will print all the payload when a reaction is added to an image
app.event('reaction_added', async ({ event, context }) => {
  try {
    const result = await app.client.reactions.get({
      token: context.botToken,
      channel: event.item.channel,
      timestamp: event.item.ts,
    });

    if (result.message && result.message.files && result.message.files.length > 0) {
      console.log(JSON.stringify(result.message, null, 2));

      const file = result.message.files[0];  // Assuming the first file is the one you're interested in.
      const reactions = result.message.reactions ? result.message.reactions.map(r => `${r.name} (${r.count})`).join(', ') : 'No reactions';

      base(process.env.RANDOMSTILLS_TABLE).create({
        'name': file.name,
        'filetype': file.filetype,
        'permalink': file.permalink,
        'permalink_public': file.permalink_public,
        'url': makeSlackImageURL(file.permalink, file.permalink_public),
        'reactions': reactions.name,
        'json': JSON.stringify(file, null, 4)
      }, function(err, record) {
        if (err) {
          console.error(err);
          return;
        }
        console.log('Added reaction event to Airtable:', record.getId());
      });
    }
  } catch (error) {
    console.error(error);
  }
});

function makeSlackImageURL (permalink, permalink_public) {
  let secrets = (permalink_public.split("slack-files.com/")[1]).split("-")
  let suffix = permalink.split("/")[(permalink.split("/").length - 1)]
  let filePath = `https://files.slack.com/files-pri/${secrets[0]}-${secrets[1]}/${suffix}?pub_secret=${secrets[2]}`
  return filePath
}

(async () => {
  await app.start(process.env.PORT || 3000);
  console.log('⚡️ Bolt app is running!');
})();



