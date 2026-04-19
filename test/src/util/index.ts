// rc > utils >ins index.ts >
// You, 18 hours ago | 1 author (You)
import axios from 'axios@1.6.8'
import sourceMap from 'source-map-js@1.2.0'
import errorStackParser from 'error-stack-parser@2.1.4'
const getSourceMap = async(url: string)=>{
  return await axios.get(url)
}
// / stackFrame.fileName 就是报错的s代码，需要根据这个Js 获取到对应的source-map
const findCodeBySourceMap = async(stackFrame: any)=>{
  // url +'存放map文件的服务地址”
  const sourceData: any = await getSourceMap(stackFrame.fileName + '.map')
  const fileContent = sourceData.data
  const consumer = await new sourceMap.SourceMapConsumer(fileContent) //通过报错位置查找到对应的源文件名称以及报错行数
  const originalPosition = consumer.originalPositionFor({
    line: stackFrame.lineNumber,
    column: stackFrame.columnNumber
  })
  // 那么就可以通过 sourceContentFor 这个方法找到报错的源代码
  const code = consumer.sourceContentFor(originalPosition.source)
  console.log(code, "还原之后的 code")
}
export { findCodeBySourceMap }


try {
  // 故意抛出一个错误
  throw new Error('Something went wrong!');
} catch (error) {
  const stackFrames = errorStackParser.parse(error);
  stackFrames.forEach((frame, index) => {
    console.log(`Frame ${index + 1}:`);
    console.log(`  File: ${frame.fileName}`);
    console.log(`  Line: ${frame.lineNumber}`);
    console.log(`  Column: ${frame.columnNumber}`);
    console.log(`  Function: ${frame.functionName}`);
    console.log(`  Is Constructor: ${frame.isConstructor}`);
    console.log(`  Method: ${frame.methodName}`);
    console.log(`  Type: ${frame.typeName}`);
    console.log(`  Eval Origin: ${frame.evalOrigin}`);
    console.log('---');
  });
}
