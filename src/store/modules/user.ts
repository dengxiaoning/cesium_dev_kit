import { Module } from 'vuex';
import { Userinfo, RootStateTypes } from '../interface/index';
import {
  getToken,
  setToken,
  removeToken
} from '../../utils/auth'
const SIMULATE_USER_TOKEN = 'USER-TOKEN'
const userstate: Module<Userinfo, RootStateTypes> = {
  state() {
    return {
       // token: getToken()
        name: '',
        avatar: '',
        roles: [],
        permissions: []
    }
  },
  mutations: {
    SET_TOKEN: (state:any, token:any) => {
      state.token = token
    },
    SET_NAME: (state:any, name:any) => {
      state.name = name
    },
    SET_AVATAR: (state:any, avatar:any) => {
      state.avatar = avatar
    },
    SET_ROLES: (state:any, roles:any) => {
      state.roles = roles
    },
    SET_PERMISSIONS: (state:any, permissions:any) => {
      state.permissions = permissions
    }
  },
  actions: {
        // 模拟登录
        Login({
          commit
        }:any, userInfo:any) {
          const username = userInfo.username.trim()
          const password = userInfo.password
          const code = userInfo.code
          const uuid = userInfo.uuid
      return new Promise((resolve: any, reject: any) => {
        var simulateToken = 'fdsakjahkhfdjasdhlafdslkdfl'
        // 模拟登录
        setToken(SIMULATE_USER_TOKEN,simulateToken)
        commit('SET_TOKEN', 'fdsakjahkhfdjasdhlafdslkdfl')
        resolve('恭喜你登录成功')
            // 生产环境调用登录接口
            // login(username, password, code, uuid).then((res:any) => {
            //   setToken(res.token)
            //   commit('SET_TOKEN', res.token)
            //   resolve()
            // }).catch((error:any) => {
            //   reject(error)
            // })
          })
        },
    
        // 获取用户信息
        GetInfo({
          commit,
          state
        }:any) {
          return new Promise((resolve:any, reject:any) => {
            var res = {
              "msg": "操作成功",
              "code": 200,
              "permissions": ["*:*:*"],
              "roles": ["admin"],
              "user": {
                "searchValue": null,
                "createBy": "admin",
                "createTime": "2018-03-16 11:33:00",
                "updateBy": null,
                "updateTime": null,
                "remark": "管理员",
                "params": {},
                "userId": 1,
                "deptId": 103,
                "userName": "admin",
                "nickName": "吉想",
                "email": "jt@qq.com",
                "phonenumber": "15888888888",
                "sex": "1",
                "avatar": "",
                "salt": null,
                "status": "0",
                "delFlag": "0",
                "loginIp": "127.0.0.1",
                "loginDate": "2018-03-16T11:33:00.000+0800",
                "dept": {
                  "searchValue": null,
                  "createBy": null,
                  "createTime": null,
                  "updateBy": null,
                  "updateTime": null,
                  "remark": null,
                  "params": {},
                  "deptId": "103",
                  "parentId": 101,
                  "ancestors": null,
                  "deptName": "研发部门",
                  "orderNum": "1",
                  "leader": "吉想",
                  "phone": null,
                  "email": null,
                  "status": "0",
                  "delFlag": null,
                  "parentName": null,
                  "children": []
                },
                "roles": [{
                  "searchValue": null,
                  "createBy": null,
                  "createTime": null,
                  "updateBy": null,
                  "updateTime": null,
                  "remark": null,
                  "params": {},
                  "roleId": 1,
                  "roleName": "超级管理员",
                  "roleKey": "admin",
                  "roleSort": "1",
                  "dataScope": "1",
                  "menuCheckStrictly": false,
                  "deptCheckStrictly": false,
                  "status": "0",
                  "delFlag": null,
                  "flag": false,
                  "menuIds": null,
                  "serverRegisterId": null,
                  "deptIds": null,
                  "admin": true
                }],
                "roleIds": null,
                "postIds": null,
                "admin": true
              }
            }
            const user = res.user
            // const avatar = user.avatar == "" ? require("@/assets/image/profile.jpg") : process.env.VUE_APP_BASE_API + user.avatar;
            if (res.roles && res.roles.length > 0) { // 验证返回的roles是否是一个非空数组
              commit('SET_ROLES', res.roles)
              commit('SET_PERMISSIONS', res.permissions)
            } else {
              commit('SET_ROLES', ['ROLE_DEFAULT'])
            }
            commit('SET_NAME', user.userName)
            // commit('SET_AVATAR', avatar)
            resolve(res)
    
            // getInfo(state.token).then(res => {
            //   const user = res.user
            //   const avatar = user.avatar == "" ? require("@/assets/image/profile.jpg") : process.env.VUE_APP_BASE_API + user.avatar;
            //   if (res.roles && res.roles.length > 0) { // 验证返回的roles是否是一个非空数组
            //     commit('SET_ROLES', res.roles)
            //     commit('SET_PERMISSIONS', res.permissions)
            //   } else {
            //     commit('SET_ROLES', ['ROLE_DEFAULT'])
            //   }
            //   commit('SET_NAME', user.userName)
            //   commit('SET_AVATAR', avatar)
            //   resolve(res)
            // }).catch(error => {
            //   reject(error)
            // })
          })
        },
    
    // 退出系统
    LogOut({
      commit,
      state
    }:any) {
      return new Promise((resolve: any, reject: any) => {
        commit('SET_TOKEN', '')
        commit('SET_ROLES', [])
        commit('SET_PERMISSIONS', [])
        removeToken(SIMULATE_USER_TOKEN)
        resolve('退出登录成功')
        // logout().then(() => {
        //   commit('SET_TOKEN', '')
        //   commit('SET_ROLES', [])
        //   commit('SET_PERMISSIONS', [])
        //   // removeToken()
        //   resolve()
        // }).catch((error:any) => {
        //   reject(error)
        // })
      })
    },
     // 前端 登出
     FedLogOut({
      commit
    }:any) {
      return new Promise((resolve:any) => {
        commit('SET_TOKEN', '')
        removeToken(SIMULATE_USER_TOKEN)
        resolve()
      })
    }
  }
}

export default userstate;