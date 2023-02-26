import Cookies from 'js-cookie'

export function getToken(key:string) {
  return Cookies.get(key)
}

export function setToken(key:string,token:string) {
  return Cookies.set(key, token)
}

export function removeToken(key:string) {
  return Cookies.remove(key)
}
