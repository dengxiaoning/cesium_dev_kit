import request from '@/utils/request';

// 用户头像上传
export function uploadAvatar2(data:Object) {
  return request({
    url: '/system/user/profile/avatar',
    method: 'post',
    data: data
  })
}




// 用户头像上传
export function uploadAvatar(data:Object) {
  return request({
    url: '/system/user/profile/test/upload/images',
    method: 'post',
    data: data
  })
}