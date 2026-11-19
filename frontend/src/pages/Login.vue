<template>
  <div class="login-bg">
    <video class="bg-video" autoplay loop muted playsinline poster="/img/bg-login.jpg">
      <source src="https://mining-api.s3.ap-southeast-5.amazonaws.com/uploads/HORAS_3000_10b5f98d06.mp4" type="video/mp4"/>
    </video>
    <div class="overlay"></div>

    <!-- center glass sign-in card (the timeline + project stats are part of the background video) -->
    <div class="glass card">
      <img src="/img/kssb.png" class="mx-auto d-block mb-3" style="height:84px" alt="KSSB"/>
      <h1 class="ltitle">Smart Monitoring System</h1>
      <p class="lsub">Sign in to continue</p>
      <label class="glbl">Email / Staff code</label>
      <input class="form-control mb-3" v-model="u" placeholder="e.g. KS0123" />
      <label class="glbl">Password</label>
      <input class="form-control mb-4" type="password" v-model="p" @keyup.enter="login"/>
      <div v-if="err" class="lerr"><i class="fa-solid fa-circle-exclamation me-1"></i>{{ err }}</div>
      <button class="btn btn-primary w-100 py-2" :disabled="busy" @click="login">{{ busy ? 'Signing in…' : 'Submit' }}</button>
      <div class="lhint"><i class="fa-solid fa-id-card-clip me-1"></i>Staff: sign in with your staff code to open Employee Self-Service.</div>
    </div>
  </div>
</template>
<script setup>
import { ref } from 'vue'; import { useRouter } from 'vue-router'
import { login as apiLogin } from '../services/api'
const u=ref('admin@kssb.local'), p=ref('password'), err=ref(''), busy=ref(false); const router=useRouter()
async function login(){
  err.value=''; busy.value=true
  try {
    const d = await apiLogin(u.value.trim(), p.value)
    router.push(d.user?.ess_only ? '/ess' : '/map')
  } catch(e){
    if (e instanceof TypeError) { localStorage.setItem('sm_auth','1'); router.push('/map') }   // API unreachable -> offline demo with mock data
    else err.value = 'Invalid staff code / e-mail or password.'
  } finally { busy.value=false }
}
</script>
<style scoped>
.login-bg{position:fixed;inset:0;background:#0a141e;display:flex;align-items:center;justify-content:center;overflow:hidden}
.bg-video{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
.overlay{position:absolute;inset:0;background:rgba(26,26,26,.45)}
.glass{position:relative;z-index:3;width:420px;max-width:92vw;padding:32px;background:var(--surface);border:1px solid var(--line);border-radius:12px;box-shadow:var(--shadow-lg)}
.ltitle{font-size:22px;font-weight:700;text-align:center;margin:0;color:var(--heading)}
.lsub{text-align:center;color:var(--muted);font-size:14px;margin:4px 0 24px}
.glbl{color:var(--g800);font-weight:600;font-size:14px;margin-bottom:6px;display:block}
.lerr{background:var(--bad-bg);color:var(--bad-fg);border:1px solid var(--bad-line);border-radius:8px;padding:8px 12px;font-size:13px;margin-bottom:12px}
.lhint{color:var(--muted);font-size:12.5px;text-align:center;margin-top:16px}
.glass .form-control{height:44px}
.powered-in{color:rgba(255,255,255,.75);font-size:11px;font-style:italic}
</style>
