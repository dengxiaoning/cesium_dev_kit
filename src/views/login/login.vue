<template>
  <div class="login">
    <div class="login_logo">
      <img src="@/assets/logo.png"
           alt=""><span>Cesium development kit</span>
    </div>
    <div class="login-container">
      <el-form :model="loginForm"
               :rules="loginRules"
               class="login-form"
               ref="loginFormRef">
        <h3 class="title">cesium_kit</h3>
        <el-form-item prop="username">
          <el-input v-model="loginForm.username"
                    type="text"
                    auto-complete="off"
                    placeholder="账号"
                    prefix-icon="el-icon-user">
          </el-input>
        </el-form-item>
        <el-form-item prop="password">
          <el-input v-model="loginForm.password"
                    type="password"
                    auto-complete="new-password"
                    placeholder="密码"
                    @keyup.enter="submitForm"
                    prefix-icon="el-icon-goods">
          </el-input>
        </el-form-item>
        <el-form-item prop="code">
          <el-input v-model="loginForm.code"
                    auto-complete="off"
                    placeholder="验证码"
                    style="width: 63%"
                    @keyup.enter="submitForm"
                    prefix-icon="el-icon-circle-check">
          </el-input>
          <div class="login-code">
            <img :src="loginForm.codeUrl"
                 @click="getCode"
                 class="login-code-img" />
          </div>
        </el-form-item>
        <el-checkbox v-model="loginForm.rememberMe"
                     style="margin:0px 0px 25px 0px;">记住密码</el-checkbox>
        <el-form-item style="width:100%;">
          <el-button :loading="custRef.loading"
                     size="medium"
                     type="primary"
                     style="width:100%;"
                     @click.prevent="submitForm">
            <span v-if="!custRef.loading">登 录</span>
            <span v-else>登 录 中...</span>
          </el-button>
        </el-form-item>
      </el-form>
      <!--  底部  -->
      <div class="el-login-footer">
        <span>Copyright © 2019-2021 <a href="#">bigdata.com</a> All Rights Reserved.</span>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
// 定义一个组件
import {
  defineComponent,
  onBeforeMount,
  onMounted,
  reactive,
  ref,
  unref
} from 'vue'
import { useRouter } from 'vue-router'
import store from 'store/index'

interface LoginInfo {
  username: string
  password: string
  codeUrl: string
  code: string
  uuid: string
  rememberMe: boolean
}

export default defineComponent({
  name: 'login',
  setup(props, ctx) {
    let custRef = reactive({
      loading: false,
      redirect: undefined
    })

    // 定义响应式对象
    const loginForm: LoginInfo = reactive({
      username: 'admin',
      password: '123456',
      codeUrl: '',
      code: '',
      uuid: '',
      rememberMe: false
    })
    //{router}是全局路由对象，route= userRoute()是当前路由对象
    const router = useRouter()
    const loginFormRef = ref()
    // 生命周期函数
    onMounted(() => {
      getCode()
    })
    const getCode = () => {
      // 调用接口获取对应的验证码图片
      loginForm.codeUrl =
        'data:image/gif;base64,/9j/4AAQSkZJRgABAgAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAA8AKADASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwDtrW1ga1hZoIySikkoOeKsCztv+feL/vgU2z/484P+ua/yqyKiMY8q0IjGPKtCIWdr/wA+0P8A3wKeLK1/59of+/YqUUpZVGWIA9TT5I9h8sexGLK0/wCfWH/v2KcLG0/59YP+/Ypl1f2tjbme6uI4Yh1d2wKntriK6gSeF1eNwGVlPBFV7PTmtoHLHsILCz/59YP+/YpwsLP/AJ9IP+/YqYU8VPLHsHLHsQjT7L/n0t/+/Y/wpw06y/587f8A79L/AIVNkCsvVfE+kaHLDFqF7HDJMcIh5JHrj096uFF1JcsI3fkgcYroaI06x/587f8A79L/AIU4abY/8+Vv/wB+l/wqZGVwCpBB6EVIKjkj2Dlj2K40yw/58rb/AL9L/hTxplh/z423/fpf8KsCnZA60csewcsexXGl6f8A8+Nt/wB+V/wp40rT/wDnwtf+/K/4Vzt58RfDlhr6aNNe/wCkltjOq5jjbsrN6/y74rrEYMMg5rWphp0knUhZPVXW/oCUXsVxpWnf8+Fr/wB+V/wpw0nTv+gfa/8Aflf8KtCnisuWPYOWPYqjSdN/6B9p/wB+V/wqtqel6fHpF66WNqrrA5VhCoIO08jitYVV1b/kC3//AF7yf+gmlKMeV6ClGPK9DkrP/jzg/wCua/yqyKr2f/HnB/1zX+VWRTj8KHH4UBOBmvLvitrVzFDaWNvK8aSEs5U4zjtXqEg+Q15L8SbF7mJZlBLQMT+B6/0/KvWyWpTp4+lKrtf89F+Iqibg7HIPpeo31vAZdQMiHGBI5IQHvzXs/glDY6Db2huPPWMfK/tXhtjHcasBbNP5cUa8+/pxXY+A/ET6NqM2h30h2M2IGPZvT6Hgj/69e/m9HFV6M6U6kXKm+ZwS6d797PVeeplTcU723Ou+KWoyQeFwsFw0M32hGBR9rcenf0rf8F6zJqnhbT7m4lMs7RYkc9WYHBJ/KvINa0jVNSuri81m+8yfJWEKBtCg8HA4APXHX15qloGr+IjA2gabciBGJ3MflaME/N83UDPpzzXLDL6FfA+ypVYuUJc0nskmraPra39aD52pXa3PR/iZJrDW8NxpV5JGsOfMjjJDH3Hr9K8n1O0l8q3uri6kuLy5OWDckDtz3r2Sz0V49BtbIzm4MEYTzCuMgdOP0rhte8KSSXzTCZkYLhB6HPWpyjOI4WcaMmlBN+9bVron1tfXv0HUp8yuen+E9ZW38JWk2pzpD5MAEkkrbQMcck1mW3xk0CbWzZNFPHaE7UvWHyk+pXqF9/zA7cf4f1mHXNCuvD+q7luANjjOC4Bzke4I5rAuNfsiG0240NIdMVjGpC4kjYcbs/3vXn8T3VDLIutVhXpuUr/ZaSSeqcb/ABPsv1Bz0TTPervxjolnc2Vqb6KWe9kWOGOFg5OejHHQe/5VwPxL8UeJdPvFttN3R2MyhRNGuTu7gnsa4PT7vRPDs63dmh1XUCf9HR1+WI9jju3+eK9VgU67psF8isolQMUYcqe6n3ByPwrnqUaeXVIV403OGvxq135LdW893cabmmr2PPptA0q18OyRXSr9ukXc105+bzOuB7Z4ruPhN41l1azOkXrF7m1jykhPLICAM+4yBXnPxDguYNUhTa32dY+CBxuzz+PStr4TWclvqU16w5dQi/TOT/SvSrwjUyeWIxNTmlJ3j5O9ml8t10IWlS0UfQanIqQVBbEmJc+lWBXx50DhVXVv+QJf/wDXtJ/6Catiqur/APIEv/8Ar2k/9BNTL4WTL4WclZ/8eUH/AFzX+VWRVey/48oP+ua/yqyKI/Cgj8KFIyK5XxNpX2mFiFzxXWCo57dZkKkVRR883ejX+mX7y2S5VuoPb86xb57r7V5lyCsvZhx+Ve86l4bWYsVXrXKXXg0yTYkj3LnOCK+kwPEU6NSMq1NS0s3b3mvXr92pjKimtGXNLsX1jQLa5lH714gW9z61zp8LXsPia2u7NlRd/wC93enfjvkV6loWm/Z7NIiuFUYAq8dIjM2/bXi08XOjUnOlopXVuln0NHG61IrSAJYbWyMrjI6ivI9ds/FNnq9zOl6txEeFJI+6Og2np+Fe4/ZB5Owelcvq/h1rjcQOtVg8ZLCttRjK+lpK4SjzHgjXdwdZjuNpjuhIMgcfNmvUrrRTfW7B4w6OOVI60yPwZ/xM0neEF0bIbFelaZpaC2VXXtXbmmaQxqpOnDlcFb/hvJdCYQ5b3PMfD/hGLTr3zoYW8wnhn5Kj0HpXqenWRFthl5I5q5FpkKNkKK0EiCrgCvLrVqlaXPVk5Pu9S0ktEeV+OPD893BIbc4lHKgjhj6H2NY/wv1bT5NSOkNDJbXagsEkOQSPvKO/HXB9/SvWNWsfPiOBzXM6R4dtbLW31BLKJbp+Gl28/wD1v61vRr0lQnSqxbvqmns/Puvy6bsTTvdHoMIAQYqYVBb58sZqwK4yhwqrq/8AyBL/AP69pP8A0E1bFVdX/wCQJf8A/XtJ/wCgmpl8LJl8LOSsv+PK3/65r/KrIrmYtauYokjVIiEUKMg9vxqT+37r/nnD/wB8n/Gso1o2RnGrGyOlFOArmf8AhIbv/nnB/wB8n/Gl/wCEiu/+ecH/AHyf8ar20R+2idPsB6imG1jY5Kiuc/4SS8/55Qf98n/Gl/4SW8/55Qf98n/Gj20Q9tE6iOJUHAqYAVyX/CT3v/PK3/75b/Gl/wCEovf+eVv/AN8t/jR7aIe2ideBQY1bqK5H/hKr7/nlb/8AfLf40v8Awld9/wA8rb/vlv8AGj20Q9tE6oWce7O0VZjQIMAVxv8Awlt//wA8bb/vlv8AGl/4S/UP+eNt/wB8t/8AFUe2iHtonbCniuH/AOEw1D/nja/98t/8VS/8JlqP/PG1/wC+W/8AiqPbRD20TuCgYcimLaoGzgVxf/CZ6j/zxtf++G/+Kpf+E11L/nhaf98N/wDFUe2iHtoneKuBUgrgP+E21L/nhaf98N/8VS/8Jxqf/PC0/wC+G/8AiqPbRD20T0EVV1f/AJAeof8AXtJ/6Ca4r/hOdT/54Wn/AHw3/wAVUdz4z1G6tZrd4bUJKjIxVWyARjj5qmVaNmKVWNmf/9k='
      loginForm.uuid = '324434433443'
    }

    // 定义校验规则
    const loginRules = reactive({
      username: [
        { required: true, trigger: 'blur', message: '用户名不能为空' }
      ],
      password: [{ required: true, trigger: 'blur', message: '密码不能为空' }],
      code: [{ required: true, trigger: 'change', message: '验证码不能为空' }]
    })
    // 重置表单
    const resetForm = () => {
      // 笨办法这么写：
      // loginForm.value.email = ''
      // loginForm.value.pass = ''
      // 明眼人这么写：
      const form = unref(loginFormRef)
      form.resetFields()
    }

    // 表单提交
    const submitForm = async () => {
      const form = unref(loginFormRef)
      if (!form) {
        return
      }
      try {
        await form.validate((valid: boolean) => {
          if (valid) {
            userlogin()
          }
        })
      } catch (err) {
        console.log(err)
      }
    }

    let userlogin = () => {
      custRef.loading = true
      // 模拟调用接口
      const proRes = store.dispatch('Login', loginForm)
      proRes
        .then((res) => {
          console.log(res)
          custRef.loading = false
          router.push({
            //传递参数使用query的话，指定path或者name都行，但使用params的话，只能使用name指定
            path: '/home',
            query: {
              num: 1
            }
          })
        })
        .catch((err) => {
          console.log(err)
          custRef.loading = false
        })
    }
    return {
      loginFormRef, // 记得导出否则无法进行ref映射，表单操作unref就会是undefined
      loginForm,
      loginRules,
      submitForm,
      custRef
    }
  }
})
</script>

<style  lang="scss" scoped>
.login {
  height: 100vh;
  background: url(../../assets/image/visual/loginBg.png);
  background-size: 100% 100%;
  .login_logo {
    width: 363px;
    height: 87px;
    padding-top: 30px;
    margin-left: 78px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #fff;
    font-size: 24px;
    img {
      width: 60px;
      height: 60px;
      margin-right: 6px;
    }
  }
  .login-container {
    height: 90%;
    display: flex;
    justify-content: center;
    align-items: center;
    .title {
      margin: 0px auto 30px auto;
      text-align: center;
      color: #707070;
    }

    .login-form {
      border-radius: 6px;
      background: #ffffff;
      width: 400px;
      padding: 25px 25px 5px 25px;
      .el-input {
        height: 38px;
        input {
          height: 38px;
        }
      }
      .input-icon {
        height: 39px;
        width: 14px;
        margin-left: 2px;
      }
    }
    .login-tip {
      font-size: 13px;
      text-align: center;
      color: #bfbfbf;
    }
    .login-code {
      width: 33%;
      height: 38px;
      float: right;
      img {
        cursor: pointer;
        vertical-align: middle;
      }
    }
    .el-login-footer {
      height: 40px;
      line-height: 40px;
      position: fixed;
      bottom: 0;
      width: 100%;
      text-align: center;
      color: #fff;
      font-family: Arial;
      font-size: 12px;
      letter-spacing: 1px;
    }
    .login-code-img {
      height: 38px;
    }
  }
}
</style>
