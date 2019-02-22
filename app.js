const Koa = require('koa');
const cors = require('koa2-cors');
const json = require('koa-json');
const session = require('koa-session');
const index = require('./routes/index')
const envConfig = require('./config')
const needTokenApi = require('./config/needTokenApi.json')
const { responseFormatter } = require('./utils/tolls')
const authenticateMiddleware = require('./middlewares/authenticate.js')

const app = new Koa();
app.use(cors());
app.use(json());

app.keys = ['cGXcA8DICAvqmXWdi1Nai3D3A3gLTeOdBJ8tPKLbfzl5t6Is4Z2D9qwLbOJuT6V']

let store = {
    storage: {},
    get(key, maxAge) {
        return {
            id: null
        }
    },
    set(key, sess, maxAge) {
        this.storage[key] = sess
    },
    destroy(key) {
        delete this.storage[key]
    }
}

app.use(session({
    key: 'koa:sess',
    maxAge: 86400000, /** (number) maxAge in ms (default is 1 days)，cookie的过期时间，这里表示2个小时 */
    overwrite: true, /** (boolean) can overwrite or not (default true) */
    httpOnly: true, /** (boolean) httpOnly or not (default true) */
    signed: true, /** (boolean) signed or not (default true) */
    store
}, app));

app.use(async (ctx, next) => {
    return next().then(() => {
        if (ctx.status === 405) {
            ctx.status = 200
            responseFormatter({
                ctx, code: '1002'
            })
        }
    }).catch(err => {
        if (err.status === 401) {
            ctx.status = 401;
            ctx.session = null;
            responseFormatter({
                ctx, code: '1004'
            })
        } else {
            console.error(err)
            responseFormatter({
                ctx, code: '1001'
            })
        }
    })
})

app.use(authenticateMiddleware().unless((ctx) => {
    for (let reg of needTokenApi[ctx.method]) {
        reg = new RegExp(reg);
        if (reg.test(ctx.path)) {
            return false
        }
    }
    return true
}))

app.use(async (ctx, next) => {
    const start = new Date()
    await next();
    const ms = new Date() - start;
    console.log(`${ctx.method} ${ctx.url} - ${ms}ms`)
})

app
    .use(index.routes())
    .use(index.allowedMethods());

app.on('error', (err, ctx) => {
    console.error('server error', err, ctx)
})

app.listen(envConfig.port, () => {
    console.log('服务器已经启动！');
});