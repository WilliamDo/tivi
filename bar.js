const CDP = require('chrome-remote-interface');

const poll = async (fn, validate, interval, maxAttempts) => {
    console.log('Start poll...');
    let attempts = 0;
  
    const executePoll = async (resolve, reject) => {
      console.log('- poll');
      const result = await fn();
      attempts++;
  
      if (validate(result)) {
        return resolve(result);
      } else if (maxAttempts && attempts === maxAttempts) {
        return reject(new Error('Exceeded max attempts'));
      } else {
        setTimeout(executePoll, interval, resolve, reject);
      }
    };
  
    return new Promise(executePoll);
  };


async function example() {
    let client;
    try {
        // connect to endpoint
        client = await CDP();
        // extract domains
        const {DOM, Network, Page} = client;
        // enable events then start!
        await Network.enable();
        await Page.enable();
        await DOM.enable();
        await Page.navigate({url: 'http://www.vietchannels.com/watch2.php?id=434'});
        await Page.loadEventFired();

        await poll(async () => {
            const {root: {nodeId: documentNodeId}} = await DOM.getDocument();
            const {nodeId: bodyNodeId} = await DOM.querySelector({
                selector: 'a.fp-fullscreen.fp-icon',
                nodeId: documentNodeId,
            });

            console.log(bodyNodeId)
            
            const box = await DOM.getBoxModel({nodeId: bodyNodeId});
            console.log(box);

            const options = {
                x: box.model.content[0] + 1,//42,
                y: box.model.content[1] + 1,//42,
                button: 'left',
                clickCount: 1
            };
            Promise.resolve().then(() => {
                options.type = 'mousePressed';
                return client.Input.dispatchMouseEvent(options);
            }).then(() => {
                options.type = 'mouseReleased';
                return client.Input.dispatchMouseEvent(options);
            }).catch((err) => {
                console.error(err);
            }).then(() => {
                client.close();
            });

        }, () => true, 1000, 5);

        

    } catch (err) {
        console.error(err);
    } finally {
        if (client) {
            await client.close();
        }
    }
}

example();