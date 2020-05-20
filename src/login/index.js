import EcomAuth from '@ecomplus/auth'
import * as md5 from 'blueimp-md5'
import { handleApiError } from '@/lib/errors'
import { hide as hideToast } from '@/lib/toast'
import loginHTML from './index.html'

const { sessionStorage, localStorage, Image, $ } = window

const $login = $('<div>').html(loginHTML).appendTo($('body'))

import('@/lib/i18n').catch(console.error)

const getDynamicBg = selector => {
  let images
  const setImages = function () {
    images = [
      '/assets/img/bg/coffee.jpg',
      '/assets/img/bg/notebook.jpg',
      '/assets/img/bg/numbers.jpg',
      '/assets/img/bg/pens.jpg',
      '/assets/img/bg/table.jpg',
      '/assets/img/bg/writer.jpg'
    ]
  }
  setImages()

  const changeBg = function () {
    const newImg = new Image()
    newImg.onload = function () {
      var img = this
      $(selector).fadeOut(1000, function () {
        $(this).css('background-image', 'url(' + img.src + ')').fadeIn()
      })
    }

    var el = Math.floor((Math.random() * (images.length - 1)))
    newImg.src = images[el]
    images.splice(el, 1)
    if (images.length === 0) {
      setImages()
    }
  }
  changeBg()
  setInterval(changeBg, 60000)
}
getDynamicBg('#full-bg')

var quote = (function () {
  var quotes = [{
    msg: {
      en_us: 'Start where you are. Use what you have. Do what you can.',
      pt_br: 'Comece de onde você está. Use o que você tiver. Faça o que você puder.'
    },
    author: 'Arthur Ashe'
  }, {
    msg: {
      en_us: 'Success is the sum of repeated small efforts day after day.',
      pt_br: 'O sucesso é a soma de pequenos esforços repetidos dia após dia.'
    },
    author: 'Robert Collier'
  }, {
    msg: {
      en_us: 'All progress takes place outside the comfort zone.',
      pt_br: 'Todo progresso acontece fora da zona de conforto.'
    },
    author: 'Michael John Bobak'
  }, {
    msg: {
      en_us: 'Courage is the resistance and mastery of fear, not its absence.',
      pt_br: 'Coragem é a resistência e o domínio do medo, não a ausência dele.'
    },
    author: 'Mark Twain'
  }, {
    msg: {
      en_us: 'The only place where success comes before work is in the dictionary.',
      pt_br: 'O único lugar em que o sucesso vem antes do trabalho é no dicionário.'
    },
    author: 'Vidal Sassoon'
  }, {
    msg: {
      en_us: 'To dream small and big requires the same work.',
      pt_br: 'Sonhar grande e sonhar pequeno dá o mesmo trabalho.'
    },
    author: 'Jorge Paulo Lemann'
  }, {
    msg: {
      en_us: 'If you want to live and are curious, sleeping is not the most important thing.',
      pt_br: 'Se você tem vontade de viver e curiosidade, dormir não é a coisa mais importante.'
    },
    author: 'Martha Stewart'
  }, {
    msg: {
      en_us: 'Do or do not, there is no try.',
      pt_br: 'Faça ou não faça. Tentativas não existem.'
    },
    author: 'Yoda'
  }, {
    msg: {
      en_us: 'You don\'t need a company with 100 people to develop this idea.',
      pt_br: 'Você não precisa de uma equipe de 100 pessoas para desenvolver uma ideia.'
    },
    author: 'Larry Page'
  }, {
    msg: {
      en_us: 'Do not let what you cannot do interfere with what you can do.',
      pt_br: 'Não deixe o que você não pode fazer interferir no que você pode fazer.'
    },
    author: 'John Wooden'
  }, {
    msg: {
      en_us: 'Winners never quit and quitters never win.',
      pt_br: 'Vencedores nunca desistem e quem desiste nunca vence.'
    },
    author: 'Vince Lombardi'
  }]
  return quotes[Math.floor((Math.random() * (quotes.length - 1)))]
}())

const $el = $('#quote-of-day')
$el.find('[data-lang="en_us"]').text(quote.msg.en_us)
$el.find('[data-lang="pt_br"]').text(quote.msg.pt_br)
$el.find('cite').text(quote.author)

const username = localStorage.getItem('username')
if (username) {
  $('#username').val(username)
}

$('#username, #password')
  .change(function () {
    if ($(this).val() !== '') {
      $(this).parent().addClass('do-float')
    }
  })
  .trigger('change')

$('#login-form').submit(function () {
  if (!$(this).hasClass('ajax')) {
    hideToast()
    const username = $('#username').val()
    const passwordPure = $('#password').val()
    const password = md5(passwordPure)
    localStorage.setItem('password', passwordPure)

    if ($('#remember').is(':checked')) {
      localStorage.setItem('username', username)
    } else {
      localStorage.removeItem('username')
    }

    const form = $(this)
    form.addClass('ajax')

    const authFail = function (jqXHR, textStatus, err) {
      if (jqXHR.status !== 403) {
        console.error(err)
      }
      handleApiError(jqXHR.responseJSON)
      form.removeClass('ajax')
    }

    $.ajax({
      url: 'https://api.e-com.plus/v1/_login.json?username',
      method: 'POST',
      dataType: 'json',
      contentType: 'application/json; charset=UTF-8',
      headers: {
        'X-Store-ID': 1
      },
      data: JSON.stringify({
        username,
        pass_md5_hash: password
      })
    })

      .done(function (data) {
        console.log('Logged')
        const storeId = data.store_id
        localStorage.setItem('store_id', storeId)

        $.ajax({
          url: 'https://api.e-com.plus/v1/_authenticate.json',
          method: 'POST',
          dataType: 'json',
          contentType: 'application/json; charset=UTF-8',
          headers: {
            'X-Store-ID': storeId
          },
          data: JSON.stringify({
            _id: data._id,
            api_key: data.api_key
          })
        })

          .done(function (json) {
            $.ajax({
              url: 'https://admin.e-com.plus/session/new',
              method: 'PUT',
              contentType: 'application/json; charset=UTF-8',
              headers: {
                'X-Store-ID': storeId,
                'X-My-ID': json.my_id,
                'X-Access-Token': json.access_token
              },
              xhrFields: {
                withCredentials: true
              }
            })

              .always(function () {
                const ssoUrl = window.location.search.split('sso_url=')[1]
                if (ssoUrl && ssoUrl !== '') {
                  window.location = 'https://admin.e-com.plus' + decodeURIComponent(ssoUrl)
                } else {
                  sessionStorage.setItem('my_id', json.my_id)
                  sessionStorage.setItem('access_token', json.access_token)
                  sessionStorage.setItem('expires', json.expires)
                  sessionStorage.setItem('username', username)

                  import('@/dashboard/')
                    .then(() => {
                      $login.remove()

                      const ecomAuth = new EcomAuth()
                      ecomAuth.login(
                        localStorage.getItem('username'),
                        localStorage.getItem('password'),
                        localStorage.getItem('store_id')
                      )
                        .then(() => {
                          localStorage.removeItem('password')
                        })
                        .catch(console.error)
                    })
                    .catch(console.error)
                }
              })
          })
          .fail(authFail)
      })
      .fail(authFail)
  }
})

$(document).keypress(function (e) {
  if (e.which === 13) {
    $('#login-form').submit()
  }
})
