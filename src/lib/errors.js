import { $ecomConfig, i18n } from '@ecomplus/utils'
import { reload } from './session'
import toast from './toast'

const handleFatalError = err => {
  if (err) {
    console.error(err)
  }
  window.alert(i18n({
    en_us: 'Fatal error, restarting in 3 seconds',
    pt_br: 'Erro fatal, reiniciando em 3 segundos'
  }))
  setTimeout(function () {
    reload()
  }, 3000)
}

const handleApiError = data => {
  let msg
  if (typeof data === 'object' && data !== null) {
    if (data.user_message) {
      msg = data.user_message[$ecomConfig.get('lang')]
    } else if (data.message) {
      msg = data.message
    }
  }
  if (msg !== undefined) {
    console.log(`API Error Code: ${data.error_code}`)
  } else {
    msg = i18n({
      en_us: 'Unknown error, please try again',
      pt_br: 'Erro desconhecido, por favor tente novamente'
    })
  }
  toast(msg, {
    duration: 7000
  })
}

export { handleFatalError, handleApiError }
