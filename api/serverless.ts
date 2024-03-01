import fastify from "fastify";

const server = fastify({ logger: true })

server.register(import('../routes'))

server.listen({ port: 3000 }, (err, addr) => {
  if(err) {
    console.error(err)
    process.exit(1)
  }

  console.log(`Server running at: ${addr}`)
})
