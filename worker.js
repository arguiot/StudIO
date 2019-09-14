addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})

/**
 * Fetch and log a given request object
 * @param {Request} request
 */
async function handleRequest(request) {
  // WebHook parsing
  if (request.method === 'POST') {
    const json = await request.json()
    if (request.headers.get("X-GitHub-Event") == "ping") {
      return new Response('Successful ping!', { status: 200 })
    }
    const name = json.repository.name
    const action = request.headers.get("X-GitHub-Event")
    const id = request.url.split("?id=")[1]
    const response = await fetch("https://onesignal.com/api/v1/notifications", {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        include_player_ids: [id],
        app_id: "fb2196f8-2d1a-43c2-aced-083dcdbf6826",
        contents: {"en": `${name}: new '${action}' action!`},

      })
    })
    return response
  }
  return new Response('Expected POST', { status: 500 })
}
