// Worker

export default {
  async fetch(request, env) {
    return await handleRequest(request, env);
  }
}

async function handleRequest(request, env) {
  let id = env.TRANSACTIONTIME.idFromName("A");
  let obj = env.TRANSACTIONTIME.get(id);
  let transactionTime = await obj.fetch(request.url);
  return new Response(JSON.stringify(await transactionTime.text()));
}

// Durable Object

export class TransactionTime {
  constructor(state, env) {
    this.state = state;
    // `blockConcurrencyWhile()` ensures no requests are delivered until
    // initialization completes.
    this.state.blockConcurrencyWhile(async () => {
        let storedDate = await this.state.storage.get("date");
        this.date = storedDate || new Date();
        let storedTimeDiff = await this.state.storage.get("timeDiff");
        this.timeDiff = storedTimeDiff || 0;
    })
  }

  // Handle HTTP requests from clients.
  async fetch(request) {
    // Apply requested action.
    let url = new URL(request.url);
    let timeSinceLastTransaction = await this.state.storage.get("timeDiff");
    let date = new Date(await this.state.storage.get("date"));
    switch (url.pathname) {
    case "/put":
      let newDate = new Date();
      console.log(date)
      timeSinceLastTransaction = Math.abs(newDate - date) / 1000;
      date = newDate
      await this.state.storage.put("date", date);
      await this.state.storage.put("timeDiff", timeSinceLastTransaction);
      break;
    case "/get":
      // Just serve the current date. No storage calls needed!
      break;
    default:
      return new Response("Not found", {status: 404});
    }

    // Return `timeSinceLastTransaction`. Note that `this.date` may have been
    // incremented or decremented by a concurrent request when we
    // yielded the event loop to `await` the `storage.put` above!
    // That's why we stored the counter date created by this
    // request in `timeSinceLastTransaction` before we used `await`.
    console.log(JSON.stringify({date, timeSinceLastTransaction}));
    return new Response([date, timeSinceLastTransaction]);
  }
}
