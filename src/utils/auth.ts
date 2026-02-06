export function isAuthenticated() {
  if (typeof window !== 'undefined') {
    return !!localStorage.getItem('isAuth');
  }
  return false;
}
export function logout() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('isAuth');
    window.location.href = '/login';
  }
}
