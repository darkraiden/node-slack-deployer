//List of colors that can be used in slack responses
exports.slackColors = {
    success: '#36a64f', //green
    warning: '#f4ce42', //yellow-ish
    failure: '#ff0000' //red
};

//Structure of the payload to send back to slack
exports.slackPayload = {
    response_type: 'in_channel',
    attachments: [
        {
            fallback: String,
            color: String,
            title: String,
            text: String
        }
    ]
};

//Generate a formatted string of hashes with ordered list
exports.generateHashesText = (data, service) => {
    let string = '';
    let max = 5;
    if (data.length < 5) {
        max = data.length;
    }
    for (let i = 0; i < max; i++) {
        string += `${i + 1}. <https://github.com/${
            process.env.GITHUB_USER
        }/${service}/commit/${data[i]}|${data[i]}>`;
        if (i < max - 1) {
            string += '\n';
        }
    }
    return string;
};

exports.payloadToSlack = (status, fallback, title, text) => {
    this.slackPayload.attachments[0].color = this.slackColors[status];
    this.slackPayload.attachments[0].fallback = fallback;
    this.slackPayload.attachments[0].title = title;
    this.slackPayload.attachments[0].text = text;
    return this.slackPayload;
};

exports.extractHash = s3Element => {
    return s3Element.Key.match(/[a-z0-9]{40}/g)[0];
};
