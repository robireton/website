document.querySelectorAll('form.unlink').forEach(form => form.addEventListener('submit', event => {
  if (!window.confirm('If you unlink this account, you will no longer be able to use it to access your user record. You will be logged out of this session. If you want to access your user record in the future you will need to use other credentials. Continue?')) event.preventDefault()
}, { passive: false }))
