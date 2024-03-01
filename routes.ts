import { FastifyInstance, RouteHandlerMethod } from "fastify";
import MangaCrawler from "manga-crawler";

export default function routes(fastify: FastifyInstance, _: never, done: (err?: Error) => void) {
  const functionNames = Object.keys(MangaCrawler)
  const docs: Record<string, { params: Array<string> }> = {}

  functionNames.forEach(functionName => {
    fastify.get(routeName(functionName), handler(functionName, docs))
  })

  fastify.get('/api', () => ({ routes: docs }))

  done()
}

function routeName(functionName: string) {
  return `/api/${functionName.replaceAll(/[A-Z]/g, char => `-${char.toLowerCase()}`)}`
}

function handler(functionName: string, docs: Record<string, { params: Array<string> }>): RouteHandlerMethod {
  const func = (MangaCrawler as Record<string, Function>)[functionName]
  const paramsList = params(func)
  const urlParamToParamMap: Record<string, string> = paramsList
    .map(param => ({ [mapParamNameToURLParam(param)]: param }))
    .reduce((acc, cur) => ({ ...acc, ...cur }), {})
  const urlParams = Object.keys(urlParamToParamMap)
  const docParams: Array<string> = []

  urlParams.forEach(param => docParams.push(param))
  docs[routeName(functionName)] = { params: docParams }

  return async({ query }, reply) => {
    const args: string[] = []
    const errors: string[] = []
    
    Object.keys(query as Record<string, string>).forEach(requestParam => {
      if(!urlParams.includes(requestParam)) {
        errors.push(requestParam)
        return
      }
      if(errors.length > 0) return

      args[paramsList.indexOf(urlParamToParamMap[requestParam])] = (query as Record<string, string>)[requestParam]
    })

    if(errors.length > 0) {
      reply.code(400)
      reply.send({
        success: false,
        reason: errors.length === 1
          ? `Argument ${errors} is not valid for the requested parameters: ${urlParams.join(', ')}`
          : `Arguments ${errors.join(', ')} are not valid for the requested parameters: ${urlParams.join(', ')}`
      })
  
      return
    }
  
    try {
      return {
        success: true,
        payload: await func.apply(null, args)
      }
    }
    catch(reason) {
      reply.code(500)
      reply.send({
        success: false,
        reason,
      })
    }
  }
}

function params (func: Function): Array<string> {
  const textFunc = func.toString()
  
  return textFunc
    .slice(textFunc.indexOf('(') + 1, textFunc.indexOf(')'))
    .split(',')
    .map(param => param.trim())
}

function mapParamNameToURLParam(param: string): string {
  return param.replaceAll(/[A-Z]/g, char => `_${char.toLowerCase()}`)
}
