const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const moment = require('moment');

const { responseFormatter } = require('./../utils/tolls');
const userModule = require('./../modules/user');

module.exports = class {
    static async create(ctx) {
        const bodyData = ctx.request.body
        if (bodyData.userName && bodyData.password && bodyData.passwordConfirm) {
            if (bodyData.password !== bodyData.passwordConfirm) {
                responseFormatter({
                    ctx, code: '1007'
                })
            } else {
                // 查询用户名是否重复
                const existUser = await userModule.findUserByName(bodyData.userName)
                if (existUser) {
                    // 反馈存在用户名
                    responseFormatter({
                        ctx, code: '1006'
                    })
                } else {
                    // 查找普通用户的角色实例
                    const role = await userModule.findRoleByRoleName('user');
                    // 加密密码
                    const salt = bcrypt.genSaltSync();
                    const hash = bcrypt.hashSync(bodyData.password, salt);
                    // 创建用户并绑定为普通用户
                    await role.createUser({ userName: bodyData.userName, password: hash });
                    responseFormatter({
                        ctx, code: '1000'
                    })
                }
            }
        } else {
            // 入参不对
            responseFormatter({
                ctx,
                code: '1003'
            });
        }
    }
    static async login(ctx) {
        const bodyData = ctx.request.body
        if (bodyData.userName && bodyData.password) {
            const user = await userModule.findUserByName(bodyData.userName);
            // 判断用户是否存在
            if (user) {
                // 判断前端传递的用户密码是否与数据库密码一致
                if (bcrypt.compareSync(bodyData.password, user.password)) {
                    const token = crypto.randomBytes(32).toString('hex');
                    const expireAt = moment().add(7, 'days')
                    await userModule.createLoginToken(token, expireAt.toDate(), user.id)
                    const role = await userModule.findRoleByRoleId(user.roleId)
                    responseFormatter({
                        ctx,
                        code: '1000',
                        data: {
                            userName: user.userName,
                            token: {
                                value: token,
                                expireAt: expireAt.format('YYYY-MM-DD HH:mm:ss')
                            },
                            roleName: role.roleName
                        }
                    })
                } else {
                    responseFormatter({
                        ctx, code: '1010'
                    })
                }

            } else {
                responseFormatter({
                    ctx, code: '1010'
                })
            }
        } else {
            // 入参不对
            responseFormatter({
                ctx, code: '1003'
            })
        }
    }
    static async getUserInfo(ctx) {

    }
};