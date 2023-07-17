const Koa = require("koa");
const router = require("koa-router")();
const KoaSSEStream = require("koa-sse-stream"); // 封装好的 SSE 中间件
const child_process = require("child_process"); // Node 子进程
const bodyParser = require("koa-bodyparser");
const cors = require("@koa/cors");
const moment = require("moment");
const newDate = () => moment().format("YYYY-MM-DD HH:mm:ss");
const app = new Koa();

app.use(cors());
app.use(bodyParser());

/*
  接下来的代码存放处
*/

// 连接池
const clientList = [];
// koa-sse-stream 配置
const SSE_CONF = {
  maxClients: 2, // 最大连接数
  pingInterval: 40000, // 重连时间
};

router.get("/api/log/push", KoaSSEStream(SSE_CONF), (ctx) => {
  // 每次连接会进行一个push
  clientList.push(ctx.sse);
});

router.post("/api/project/build", (ctx) => {
  // 接收项目绝对路径
  const { projectPath } = ctx.request.body;
  try {
    // 先响应
    ctx.body = {
      msg: "开始构建，请留意下方的构建信息。",
    };
    // 再执行构建
    buildProject(projectPath);
  } catch (error) {
    ctx.body = {
      msg: error,
    };
  }
});

/**
 * 执行命令
 * @param {String} script 需要执行的脚本
 * @param {Function} callback 回调函数
 * @returns 
 */
const implementCommand = async (script, callback) => {
  callback(script)
  return new Promise((resolve, reject) => {
    try {
      const sh = child_process.exec(script, (error, stdout, stderr) => {
        // 这里的 stdout stderr 在执行之后才会触发
        if (error) {
          callback(error)
          reject(error)
        }
        resolve()
      })
      // 成功的推送
      sh.stdout.on('data', data => {
        callback(data)
      })
      // 错误的推送
      sh.stderr.on('data', error => {
        callback(error)
      })
    } catch (error) {
      callback(error)
      reject()
    }
  })
}

/**
 * buildProject 只负责整合需要执行哪些命令 
 * 整合之后调用 implementCommand 执行命令 
 * implementCommand 会执行 messagePush 进行消息推送。
 */ 
/**
 * 打包项目
 * @param {String} projectPath 打包路径
 */
const buildProject = async projectPath => {
  // 执行 install 命令
  await implementCommand(`cd ${projectPath} && pnpm i`, messagePush)
  // 执行 build 命令
  await implementCommand(`cd ${projectPath} && pnpm build `, messagePush)
}

/**
 * 消息推送
 * @param {String} content 需要推送的内容
 */
const messagePush = content => {
  clientList.forEach(sse => sse.send(`[${newDate()}] ${content}`))
  // send 自定义事件写法
    // clientList.forEach(sse => sse.send({ data: content, event: 'push' }))
}


app.use(router.routes());
app.listen(3000);
