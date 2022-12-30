const search = document.getElementById('user-search')
const select = document.getElementById('user-options')
const getOptions = {
  mode: 'same-origin',
  cache: 'no-cache',
  credentials: 'same-origin',
  redirect: 'error',
  referrerPolicy: 'no-referrer'
}

const patchOptions = {
  method: 'PATCH',
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json'
  },
  mode: 'same-origin',
  cache: 'no-cache',
  credentials: 'same-origin',
  redirect: 'error',
  referrerPolicy: 'no-referrer'
}

async function selectMember (option) {
  select.classList.add('hidden')
  search.value = option.text
  const response = await window.fetch(`${search.dataset.action}?${new URLSearchParams({ id: option.value })}`, getOptions)
  if (response.ok) {
    document.getElementById('site-user').outerHTML = await response.text()
    initStatus(document.getElementById('meta-status'))
    initRoles(document.getElementById('meta-roles'))
  }
}

async function initSearch () {
  select.addEventListener('keydown', async event => {
    switch (event.key) {
      case 'ArrowUp':
        if (event.target.selectedIndex === 0) search.focus()
        break
      case 'Enter':
        selectMember(event.target.selectedOptions[0])
        break
      case 'Escape':
        search.focus()
        break
    }
  }, { passive: true })

  select.addEventListener('dblclick', async event => {
    if (event.target instanceof window.Option) {
      selectMember(event.target)
    }
  }, { passive: true })

  search.addEventListener('keydown', async event => {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      event.stopPropagation()
      select.options[0].selected = true
      select.focus()
    }
  }, { passive: false })

  search.addEventListener('input', async event => {
    const query = event.target.value.trim()
    if (query.length >= 2) {
      const response = await window.fetch(`${event.target.dataset.action}?${new URLSearchParams({ search: event.target.value })}`, getOptions)
      if (response.ok) {
        const hits = await response.json()
        if (hits.length > 0) {
          select.replaceChildren(...hits.map(hit => new window.Option(hit.text, hit.value)))
          select.classList.remove('hidden')
          return
        }
      }
    }
    select.classList.add('hidden')
    select.replaceChildren()
    document.getElementById('site-user').replaceChildren()
  }, { passive: true })

  if (select.options.length > 0) selectMember(select.options.item(0))
}

async function patchStatus (url, value) {
  const request = Object.fromEntries(Object.entries(patchOptions))
  request.body = JSON.stringify({ option: value })
  const response = await window.fetch(url, request)
  if (response.ok) return (await response.json()).disabled
}

async function initStatus (row) {
  if (row) {
    row.querySelector('td').addEventListener('click', async event => {
      const cell = event.target.closest('td')
      if (cell.classList.contains('editing')) {
        if (event.target.tagName === 'INPUT') {
          const current = cell.dataset.value === 'false'
          const selected = event.target.value === 'active'
          const updated = (current !== selected) ? await patchStatus(cell.dataset.patch, !selected) : cell.dataset.value
          cell.classList.remove('editing')
          cell.dataset.value = updated
          if (updated === false || updated === 'false') {
            cell.innerHTML = '✅ <span class="keyword">active</span>'
          } else {
            const d = new Date(updated)
            cell.innerHTML = `❌ <span class="keyword">disabled</span> (<time datetime="${d.toISOString()}">${d.toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</time>)`
          }
        }
      } else {
        cell.classList.add('editing')
        cell.innerHTML = `<label><input type="radio" name="status" value="active"${cell.dataset.value === 'false' ? ' checked' : ''}> Active</label><label><input type="radio" name="status" value="disabled"${cell.dataset.value === 'false' ? '' : ' checked'}> Disabled</label>`
      }
    }, { passive: true })
  }
}

async function processRoles (element, update) {
  if (update) {
    const original = new Map(JSON.parse(element.dataset.value).map(e => [e.role, e.selected]))
    const selected = new Map(Array.from(element.querySelectorAll('input[type=checkbox]')).map(i => [i.value, i.checked]))
    if (Array.from(original.entries()).some(([key, value]) => value !== selected.get(key))) {
      const request = Object.fromEntries(Object.entries(patchOptions))
      request.body = JSON.stringify(Array.from(selected.entries()).filter(([_, value]) => value).map(([role, _]) => role))
      const response = await window.fetch(element.dataset.patch, request)
      if (response.ok) {
        const result = await response.json()
        element.dataset.value = JSON.stringify(JSON.parse(element.dataset.value).map(e => ({ role: e.role, selected: result.includes(e.role) })))
      }
    }
  }
  element.classList.remove('editing')
  element.innerHTML = '<ul>' + JSON.parse(element.dataset.value).filter(e => e.selected).map(e => `<li>${e.role}</li>`).join('') + '</ul>'
}

async function initRoles (row) {
  if (row) {
    const cell = row.querySelector('td')
    cell.addEventListener('keydown', event => {
      if (event.key === 'Enter') processRoles(cell, true)
      if (event.key === 'Escape') processRoles(cell, false)
    }, { passive: true })
    cell.addEventListener('click', async event => {
      if (cell.classList.contains('editing')) {
        if (event.target.tagName === 'INPUT') {
          if (event.target.value === 'Save') processRoles(cell, true)
          if (event.target.value === 'Cancel') processRoles(cell, false)
        }
      } else {
        cell.classList.add('editing')
        const roles = JSON.parse(cell.dataset.value)
        cell.innerHTML = roles.map(r => `<label><input type="checkbox" value="${r.role}"${r.selected ? ' checked' : ''}> ${r.role}</label>`).join('') + '<div><input type="button" value="Save"><input type="button" value="Cancel"></div>'
        cell.querySelector('input').focus()
      }
    }, { passive: true })
  }
}

if (search && select) initSearch()
