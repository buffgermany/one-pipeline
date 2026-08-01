<script lang="ts">
  import { goto } from '$app/navigation';
  import ShieldCheck from 'lucide-svelte/icons/shield-check';
  import Lock from 'lucide-svelte/icons/lock';
  import Eye from 'lucide-svelte/icons/eye';
  import EyeOff from 'lucide-svelte/icons/eye-off';
  import ArrowLeft from 'lucide-svelte/icons/arrow-left';
  import CheckCircle2 from 'lucide-svelte/icons/check-circle-2';
  import AlertTriangle from 'lucide-svelte/icons/alert-triangle';
  import Loader2 from 'lucide-svelte/icons/loader-2';

  interface Profile {
    id: string;
    name: string;
    email: string;
    avatar: string | null;
    role: string | null;
  }

  let { data } = $props<{ data: { profiles: Profile[] } }>();

  // Active step: 'SELECT_PROFILE' or 'ENTER_PASSWORD'
  let step = $state<'SELECT_PROFILE' | 'ENTER_PASSWORD'>('SELECT_PROFILE');
  let selectedProfile = $state<Profile | null>(null);
  let password = $state('');
  let showPassword = $state(false);
  let isLoading = $state(false);
  let errorMessage = $state<string | null>(null);
  let remainingAttempts = $state<number | null>(null);
  let isShaking = $state(false);

  // Profile Specific Theme Styling
  const profileThemes: Record<string, {
    bgGradient: string;
    borderGlow: string;
    avatarBg: string;
    textColor: string;
    badgeBg: string;
  }> = {
    'agent-felix': {
      bgGradient: 'from-emerald-500/20 via-emerald-500/5 to-transparent',
      borderGlow: 'hover:border-emerald-500/80 hover:shadow-[0_0_35px_rgba(16,185,129,0.35)]',
      avatarBg: 'bg-gradient-to-br from-emerald-400 to-teal-600 text-neutral-950',
      textColor: 'text-emerald-400',
      badgeBg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
    },
    'agent-leon': {
      bgGradient: 'from-purple-500/20 via-purple-500/5 to-transparent',
      borderGlow: 'hover:border-purple-500/80 hover:shadow-[0_0_35px_rgba(168,85,247,0.35)]',
      avatarBg: 'bg-gradient-to-br from-purple-400 to-indigo-600 text-white',
      textColor: 'text-purple-400',
      badgeBg: 'bg-purple-500/10 text-purple-400 border-purple-500/20'
    },
    'agent-luca': {
      bgGradient: 'from-amber-500/20 via-amber-500/5 to-transparent',
      borderGlow: 'hover:border-amber-500/80 hover:shadow-[0_0_35px_rgba(245,158,11,0.35)]',
      avatarBg: 'bg-gradient-to-br from-amber-400 to-orange-600 text-neutral-950',
      textColor: 'text-amber-400',
      badgeBg: 'bg-amber-500/10 text-amber-400 border-amber-500/20'
    }
  };

  function selectProfile(profile: Profile) {
    selectedProfile = profile;
    password = '';
    errorMessage = null;
    remainingAttempts = null;
    step = 'ENTER_PASSWORD';
  }

  function backToProfiles() {
    step = 'SELECT_PROFILE';
    selectedProfile = null;
    password = '';
    errorMessage = null;
  }

  async function handleLogin(e?: Event) {
    if (e) e.preventDefault();
    if (!selectedProfile || !password) return;

    isLoading = true;
    errorMessage = null;

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: selectedProfile.id,
          password
        })
      });

      const body = await res.json();

      if (!res.ok) {
        errorMessage = body.error || 'Anmeldung fehlgeschlagen.';
        remainingAttempts = body.remainingAttempts ?? null;
        triggerShake();
        return;
      }

      // Successful login -> Redirect to main dashboard
      window.location.href = '/';
    } catch (err) {
      console.error('Login error:', err);
      errorMessage = 'Verbindungsfehler. Bitte versuche es erneut.';
      triggerShake();
    } finally {
      isLoading = false;
    }
  }

  function triggerShake() {
    isShaking = true;
    setTimeout(() => {
      isShaking = false;
    }, 600);
  }
</script>

<svelte:head>
  <title>Anmeldung | Buff Pipeline</title>
</svelte:head>

<div class="min-h-screen w-screen bg-[#07080B] text-white flex flex-col justify-between relative overflow-hidden select-none font-[var(--font-general-sans)]">
  
  <!-- Ambient Backlight Effects -->
  <div class="absolute -top-40 -left-40 w-96 h-96 bg-emerald-500/10 rounded-full blur-[120px] pointer-events-none"></div>
  <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-sky-500/5 rounded-full blur-[160px] pointer-events-none"></div>
  <div class="absolute -bottom-40 -right-40 w-96 h-96 bg-purple-500/10 rounded-full blur-[120px] pointer-events-none"></div>

  <!-- Top Brand Navigation Header -->
  <header class="p-6 sm:p-10 flex items-center justify-between z-20">
    <div class="flex items-center gap-3">
      <div class="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-neutral-950 shadow-lg shadow-emerald-500/20 font-bold font-[var(--font-excon)] text-sm">
        B
      </div>
      <div class="flex flex-col">
        <span class="text-base font-bold font-[var(--font-excon)] tracking-tight text-white leading-none">BUFF PIPELINE</span>
        <span class="text-[11px] text-neutral-400 font-medium leading-none mt-1">Cold Call Cockpit</span>
      </div>
    </div>

    <div class="flex items-center gap-2 px-3 py-1.5 rounded-full bg-neutral-900/80 border border-neutral-800/80 backdrop-blur-md text-xs text-neutral-400 font-medium">
      <ShieldCheck size={14} class="text-emerald-400" />
      <span>End-to-End Geschützt</span>
    </div>
  </header>

  <!-- Main Central Profile Selection Stage -->
  <main class="flex-1 flex flex-col items-center justify-center p-6 z-20 max-w-4xl mx-auto w-full">
    
    {#if step === 'SELECT_PROFILE'}
      <!-- STEP 1: STREAMING SERVICE PROFILE SELECTOR -->
      <div class="text-center mb-10 sm:mb-14 space-y-3 animate-in fade-in duration-300">
        <h1 class="text-3xl sm:text-5xl font-extrabold font-[var(--font-excon)] tracking-tight text-transparent bg-clip-text bg-gradient-to-b from-white via-neutral-100 to-neutral-400">
          Wer telefoniert gerade?
        </h1>
        <p class="text-sm sm:text-base text-neutral-400 max-w-md mx-auto">
          Wähle dein Profil aus, um dich im Vertriebs-Cockpit anzumelden.
        </p>
      </div>

      <!-- Profile Cards Grid -->
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-8 w-full max-w-2xl px-4 animate-in fade-in zoom-in-95 duration-300">
        {#each data.profiles as profile}
          {@const theme = profileThemes[profile.id] || profileThemes['agent-felix']}
          
          <button
            type="button"
            onclick={() => selectProfile(profile)}
            class="group relative flex flex-col items-center p-6 sm:p-8 rounded-2xl bg-neutral-900/60 border border-neutral-800/80 backdrop-blur-xl transition-all duration-300 ease-out hover:-translate-y-2 cursor-pointer outline-none {theme.borderGlow}"
          >
            <!-- Background Glow Tint on Hover -->
            <div class="absolute inset-0 rounded-2xl bg-gradient-to-b {theme.bgGradient} opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>

            <!-- Avatar Circle -->
            <div class="relative w-24 h-24 sm:w-28 sm:h-28 rounded-full {theme.avatarBg} flex items-center justify-center font-bold font-[var(--font-excon)] text-2xl sm:text-3xl shadow-2xl transition-transform duration-300 group-hover:scale-105 mb-5 ring-4 ring-neutral-900/80">
              {profile.avatar || profile.name.slice(0, 2).toUpperCase()}
            </div>

            <!-- Profile Details -->
            <div class="relative flex flex-col items-center gap-1.5 text-center">
              <span class="text-lg sm:text-xl font-bold font-[var(--font-excon)] text-white group-hover:{theme.textColor} transition-colors">
                {profile.name}
              </span>
            </div>
          </button>
        {/each}
      </div>

    {:else if step === 'ENTER_PASSWORD' && selectedProfile}
      <!-- STEP 2: PASSWORD ENTRY MODAL -->
      {@const theme = profileThemes[selectedProfile.id] || profileThemes['agent-felix']}
      
      <div class="w-full max-w-md animate-in fade-in zoom-in-95 duration-300">
        
        <!-- Back Button -->
        <button
          type="button"
          onclick={backToProfiles}
          class="flex items-center gap-2 text-xs font-medium text-neutral-400 hover:text-white transition-colors mb-6 cursor-pointer group"
        >
          <ArrowLeft size={16} class="group-hover:-translate-x-1 transition-transform" />
          <span>Profil wechseln</span>
        </button>

        <!-- Main Card Container -->
        <div 
          class="relative p-8 rounded-2xl bg-neutral-900/80 border border-neutral-800 backdrop-blur-2xl shadow-2xl flex flex-col items-center text-center overflow-hidden {isShaking ? 'animate-shake' : ''}"
        >
          <!-- Selected Profile Avatar Ring -->
          <div class="relative w-20 h-20 rounded-full {theme.avatarBg} flex items-center justify-center font-bold font-[var(--font-excon)] text-2xl shadow-xl ring-4 ring-neutral-950 mb-4">
            {selectedProfile.avatar || selectedProfile.name.slice(0, 2).toUpperCase()}
          </div>

          <h2 class="text-2xl font-bold font-[var(--font-excon)] text-white mb-6">
            Hallo, {selectedProfile.name}!
          </h2>

          <!-- Password Form -->
          <form onsubmit={handleLogin} class="w-full space-y-4">
            
            <!-- Error Banner -->
            {#if errorMessage}
              <div class="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-start gap-2.5 text-left animate-in fade-in duration-200">
                <AlertTriangle size={16} class="shrink-0 mt-0.5" />
                <div class="flex-1 min-w-0">
                  <p class="font-medium">{errorMessage}</p>
                  {#if remainingAttempts !== null && remainingAttempts > 0}
                    <p class="text-[11px] text-red-400/80 mt-0.5">Verbleibende Versuche: {remainingAttempts}</p>
                  {/if}
                </div>
              </div>
            {/if}

            <!-- Password Input Field -->
            <div class="relative text-left">
              <label for="password-input" class="block text-xs font-medium text-neutral-300 mb-1.5 ml-1">
                Passwort eingeben
              </label>
              
              <div class="relative flex items-center">
                <div class="absolute left-3.5 text-neutral-500 pointer-events-none">
                  <Lock size={16} />
                </div>
                
                <input
                  id="password-input"
                  type={showPassword ? 'text' : 'password'}
                  bind:value={password}
                  placeholder="••••••••"
                  required
                  autofocus
                  autocomplete="current-password"
                  disabled={isLoading}
                  class="w-full bg-neutral-950/80 border border-neutral-800 focus:border-emerald-500/80 focus:ring-2 focus:ring-emerald-500/20 rounded-xl pl-10 pr-10 py-3 text-sm text-white placeholder-neutral-600 outline-none transition-all font-[var(--font-mono)]"
                />

                <button
                  type="button"
                  onclick={() => showPassword = !showPassword}
                  class="absolute right-3.5 text-neutral-500 hover:text-neutral-300 transition-colors p-1"
                  title={showPassword ? 'Passwort verbergen' : 'Passwort anzeigen'}
                >
                  {#if showPassword}
                    <EyeOff size={16} />
                  {:else}
                    <Eye size={16} />
                  {/if}
                </button>
              </div>
            </div>

            <!-- Submit Button -->
            <button
              type="submit"
              disabled={isLoading || !password}
              class="w-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-neutral-950 font-bold font-[var(--font-excon)] py-3 px-4 rounded-xl text-sm transition-all duration-200 active:scale-[0.98] shadow-lg shadow-emerald-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer mt-2"
            >
              {#if isLoading}
                <Loader2 size={18} class="animate-spin" />
                <span>Anmelden...</span>
              {:else}
                <CheckCircle2 size={18} />
                <span>Cockpit Betreten</span>
              {/if}
            </button>
          </form>

        </div>
      </div>
    {/if}

  </main>

  <!-- Footer Info -->
  <footer class="p-6 text-center text-xs text-neutral-500 z-20">
    <p>© {new Date().getFullYear()} Buff Pipeline · Cold Call & Lead Intelligence Platform</p>
  </footer>

</div>

<style>
  @keyframes shake {
    0%, 100% { transform: translateX(0); }
    20%, 60% { transform: translateX(-8px); }
    40%, 80% { transform: translateX(8px); }
  }

  .animate-shake {
    animation: shake 0.5s cubic-bezier(.36,.07,.19,.97) both;
  }
</style>
