const form = document.getElementById('users-profile-form')

function handlePronounFocus (event) {
  event.target.closest('tr').querySelector('input[type=radio]').checked = true
  setDisplay()
}

function handlePronounInput (event) {
  if (event.target.value) {
    event.target.value = String(event.target.value.toLowerCase().replace(/[^a-z]/g, ''))
  }
}

function setDisplay () {
  const nameCustom = form.querySelector('input[name=full-name-option]:checked').value
  const fullname = form.querySelector('input[name=fullname]')
  const nickname = form.querySelector('input[name=nickname]')
  const pronouns = form.querySelector('input[name=pronouns]:checked').value
  if (nameCustom === 'auto') {
    const names = new Map(Array.from(form.querySelectorAll('div#name-subfields input')).map(input => [input.name, input.value.trim()]))
    const autoName = [names.get('honorific-prefix'), names.get('given-name'), names.get('additional-name'), names.get('family-name'), /^[sj]r[.]?$/i.test(names.get('honorific-suffix')) ? `, ${names.get('honorific-suffix')}` : names.get('honorific-suffix')].filter(s => !!s).join(' ')
    fullname.value = autoName
    fullname.disabled = true
  } else {
    fullname.disabled = false
  }
  if (nickname.value.trim().length === 0) nickname.value = form.querySelector('input[name=given-name]').value.trim()
  if (pronouns === 'other') {
    form.querySelector('input[name=subjective]').required = true
    form.querySelector('input[name=objective]').required = true
    form.querySelector('input[name=possessive]').required = true
    form.querySelector('input[name=subjective]').tabIndex = 1 + form.querySelector('input[name=pronouns]:checked').tabIndex
    form.querySelector('input[name=objective]').tabIndex = 1 + form.querySelector('input[name=subjective]').tabIndex
    form.querySelector('input[name=possessive]').tabIndex = 1 + form.querySelector('input[name=objective]').tabIndex
  } else {
    form.querySelector('input[name=subjective]').required = false
    form.querySelector('input[name=objective]').required = false
    form.querySelector('input[name=possessive]').required = false
    form.querySelector('input[name=subjective]').tabIndex = -1
    form.querySelector('input[name=objective]').tabIndex = -1
    form.querySelector('input[name=possessive]').tabIndex = -1
  }
}

function init () {
  form.querySelectorAll('#name-subfields input[type=text]').forEach(input => input.addEventListener('input', _ => setDisplay(), { passive: true }))
  form.querySelectorAll('input[name=full-name-option]').forEach(input => input.addEventListener('input', _ => setDisplay(), { passive: true }))
  form.querySelectorAll('input[name=pronouns]').forEach(input => input.addEventListener('input', _ => setDisplay(), { passive: true }))
  form.querySelectorAll('#field-pronouns input[type=text]').forEach(input => input.addEventListener('focus', handlePronounFocus), { passive: true })
  form.querySelectorAll('#field-pronouns input[type=text]').forEach(input => input.addEventListener('input', handlePronounInput), { passive: true })
  form.querySelectorAll('input[type=button][value=verify]').forEach(input => input.addEventListener('click', _ => window.alert('eventually\u2009—\u2009for now it doesn’t matter'), { passive: true }))
  setDisplay()
}

init()
