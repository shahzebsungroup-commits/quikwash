(function () {
    "use strict";

    const API_ROOT = "https://app.vbo.co.in/kwikkwash/customer";
    const ACCESS_KEY = "kwikkwash_customer_access";
    const REFRESH_KEY = "kwikkwash_customer_refresh";
    const PROMPT_KEY = "kwikkwash_auth_prompt_dismissed_until";
    const PROMPT_DELAY_MS = 3500;
    const PROMPT_DISMISS_MS = 7 * 24 * 60 * 60 * 1000;
    const IS_HOME_PAGE = document.body?.dataset.kwaPage === "home";
    const PRODUCT_URL = IS_HOME_PAGE ? "product/" : "./";
    const GOOGLE_MAPS_API_KEY = "AIzaSyB82gWcx0dAeta4yTi7ZjmNjAa-CgC1aI0";
    const AVATAR_PRESETS = {
        crown: "Crown",
        classic: "Aarav",
        driver: "Meera",
        spark: "Kabir",
        royal: "Tara",
        happy: "Rohan",
    };

    const state = {
        accessToken: localStorage.getItem(ACCESS_KEY) || "",
        refreshToken: localStorage.getItem(REFRESH_KEY) || "",
        user: null,
        challenge: null,
        authType: "phone",
        bookingResolver: null,
        refreshing: null,
        homePromptActive: false,
        homeOfferHandled: false,
        compactAuth: false,
        otpSubmitting: false,
        deletionFlow: null,
        deletionSubmitting: false,
        isNewCustomer: false,
        otpRequesting: false,
        autoOtpTimer: null,
    };
    let resolveReady;
    const ready = new Promise(resolve => { resolveReady = resolve; });

    function escapeHtml(value) {
        return String(value ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    function avatarContent(user = state.user) {
        if (user?.avatar_type === "upload" && /^\/kwikkwash\/customer\/avatars\/[0-9a-f]{32}\.(jpg|png|webp)$/.test(user.avatar_url || "")) {
            return `<img src="${escapeHtml(new URL(user.avatar_url, API_ROOT).href)}" alt="">`;
        }
        if (user?.avatar_type === "preset" && user.avatar_value === "crown") {
            return `<i class="fas fa-crown kwa-default-crown" aria-hidden="true"></i>`;
        }
        if (user?.avatar_type === "preset" && AVATAR_PRESETS[user.avatar_value]) {
            return `<span class="kwa-preset-avatar kwa-preset-${escapeHtml(user.avatar_value)}" aria-hidden="true"></span>`;
        }
        return `<i class="fas fa-crown kwa-default-crown" aria-hidden="true"></i>`;
    }

    function apiMessage(data, fallback) {
        if (typeof data?.detail === "string") return data.detail;
        if (Array.isArray(data?.detail)) {
            const issue = data.detail.find(item => typeof item?.msg === "string");
            if (issue) return issue.msg.replace(/^Value error,\s*/i, "");
        }
        if (typeof data?.message === "string") return data.message;
        return fallback;
    }

    function storeTokens(data) {
        if (data?.access_token) {
            state.accessToken = data.access_token;
            localStorage.setItem(ACCESS_KEY, data.access_token);
        }
        if (data?.refresh_token) {
            state.refreshToken = data.refresh_token;
            localStorage.setItem(REFRESH_KEY, data.refresh_token);
        }
    }

    function clearTokens() {
        state.accessToken = "";
        state.refreshToken = "";
        state.user = null;
        state.isNewCustomer = false;
        localStorage.removeItem(ACCESS_KEY);
        localStorage.removeItem(REFRESH_KEY);
    }

    async function refreshSession() {
        if (!state.refreshToken) return false;
        if (state.refreshing) return state.refreshing;
        state.refreshing = (async () => {
            try {
                const response = await fetch(`${API_ROOT}/refresh`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ refresh_token: state.refreshToken }),
                });
                const data = await response.json().catch(() => ({}));
                if (!response.ok) throw new Error("refresh failed");
                storeTokens(data);
                return true;
            } catch (error) {
                clearTokens();
                return false;
            } finally {
                state.refreshing = null;
            }
        })();
        return state.refreshing;
    }

    async function authFetch(path, options = {}, retry = true) {
        const headers = new Headers(options.headers || {});
        if (state.accessToken) headers.set("Authorization", `Bearer ${state.accessToken}`);
        const response = await fetch(path.startsWith("http") ? path : `${API_ROOT}${path}`, {
            ...options,
            headers,
        });
        if (response.status === 401 && retry && state.refreshToken && await refreshSession()) {
            return authFetch(path, options, false);
        }
        return response;
    }

    async function loadMe() {
        if (!state.accessToken && !(await refreshSession())) {
            state.user = null;
            updateAccountButton();
            return null;
        }
        try {
            const response = await authFetch("/me");
            const data = await response.json().catch(() => ({}));
            if (!response.ok) throw new Error(apiMessage(data, "Could not load profile"));
            state.user = data.customer;
            updateAccountButton();
            syncBookingFields();
            return state.user;
        } catch (error) {
            clearTokens();
            updateAccountButton();
            return null;
        }
    }

    function injectUi() {
        if (document.getElementById("kwaAccountButton")) return;
        document.body.insertAdjacentHTML("beforeend", `
            <button id="kwaAccountButton" class="kwa-account-button" type="button" aria-label="Open account menu" aria-expanded="false">
                <span class="kwa-account-icon"><i class="fas ${IS_HOME_PAGE ? "fa-bars" : "fa-user"}"></i></span><span class="kwa-account-label">${IS_HOME_PAGE ? "Menu" : "Sign in"}</span>
            </button>
            <div id="kwaDrawerBackdrop" class="kwa-drawer-backdrop"></div>
            <aside id="kwaAccountDrawer" class="kwa-account-drawer" aria-label="Kwikkwash menu" aria-hidden="true">
                <div class="kwa-drawer-topbar">
                    <span>Kwikkwash</span>
                    <button id="kwaDrawerClose" type="button" aria-label="Close menu"><i class="fas fa-xmark"></i></button>
                </div>
                <div id="kwaDrawerBody"></div>
            </aside>
            <div id="kwaModal" class="kwa-modal" role="dialog" aria-modal="true" aria-labelledby="kwaModalTitle">
                <div class="kwa-modal-card">
                    <button id="kwaModalClose" class="kwa-modal-close" type="button" aria-label="Close">&times;</button>
                    <div id="kwaModalBody"></div>
                </div>
            </div>
            <div id="kwaCropper" class="kwa-cropper" role="dialog" aria-modal="true" aria-labelledby="kwaCropTitle">
                <div class="kwa-cropper-card">
                    <div class="kwa-cropper-heading"><div><small>PROFILE PICTURE</small><h2 id="kwaCropTitle">Crop your photo</h2></div><button id="kwaCropCancelTop" type="button" aria-label="Cancel crop">&times;</button></div>
                    <div class="kwa-crop-stage"><canvas id="kwaCropCanvas" width="300" height="300"></canvas><span class="kwa-crop-ring"></span></div>
                    <label class="kwa-crop-zoom" for="kwaCropZoom"><i class="fas fa-image"></i><input id="kwaCropZoom" type="range" min="1" max="3" step="0.01" value="1"><i class="fas fa-image"></i></label>
                    <p>Drag to position your photo.</p>
                    <div class="kwa-crop-actions"><button id="kwaCropCancel" type="button">Cancel</button><button id="kwaCropApply" type="button"><i class="fas fa-check"></i> Use photo</button></div>
                </div>
            </div>
        `);
        if (!IS_HOME_PAGE) {
            const accountSlot = document.getElementById("kwaProductAccountSlot");
            const accountButton = document.getElementById("kwaAccountButton");
            if (accountSlot && accountButton) accountSlot.appendChild(accountButton);
        }
        document.getElementById("kwaAccountButton").addEventListener("click", () => {
            if (document.getElementById("kwaAccountDrawer").classList.contains("is-open")) closeDrawer(true);
            else if (state.user) renderAccount();
            else renderGuestMenu();
        });
        document.getElementById("kwaDrawerClose").addEventListener("click", () => closeDrawer(true));
        document.getElementById("kwaDrawerBackdrop").addEventListener("click", () => closeDrawer(true));
        document.getElementById("kwaModalClose").addEventListener("click", closeModal);
        document.getElementById("kwaModal").addEventListener("click", event => {
            if (event.target.id === "kwaModal") closeModal();
        });
        document.addEventListener("keydown", event => {
            if (event.key !== "Escape") return;
            if (document.getElementById("kwaCropper")?.classList.contains("is-open")) document.getElementById("kwaCropCancelTop")?.click();
            else if (document.getElementById("kwaModal")?.classList.contains("is-open")) closeModal();
            else closeDrawer(true);
        });
    }

    function drawerBody() {
        return document.getElementById("kwaDrawerBody");
    }

    function openDrawer({ preserveBookingFlow = false } = {}) {
        closeModal(false, preserveBookingFlow);
        document.getElementById("kwaAccountDrawer")?.classList.add("is-open");
        document.getElementById("kwaDrawerBackdrop")?.classList.add("is-open");
        document.getElementById("kwaAccountDrawer")?.setAttribute("aria-hidden", "false");
        document.getElementById("kwaAccountButton")?.setAttribute("aria-expanded", "true");
        document.body.classList.add("kwa-drawer-open");
    }

    function closeDrawer(cancelBookingFlow = false) {
        document.getElementById("kwaAccountDrawer")?.classList.remove("is-open");
        document.getElementById("kwaDrawerBackdrop")?.classList.remove("is-open");
        document.getElementById("kwaAccountDrawer")?.setAttribute("aria-hidden", "true");
        document.getElementById("kwaAccountButton")?.setAttribute("aria-expanded", "false");
        document.body.classList.remove("kwa-drawer-open");
        if (cancelBookingFlow && state.bookingResolver && !(state.user?.phone_verified && state.user?.name)) {
            state.bookingResolver(null);
            state.bookingResolver = null;
        }
    }

    function renderGuestMenu() {
        drawerBody().innerHTML = `
            <div class="kwa-menu-guest">
                <span class="kwa-menu-mark"><i class="fas fa-sparkles"></i></span>
                <h2>Welcome</h2>
                <p>Sign in securely with a one-time code.</p>
                <button id="kwaMenuSignin" class="kwa-primary-button" type="button">Sign in / Sign up</button>
            </div>
            <nav class="kwa-menu-links" aria-label="Quick links">
                <a href="${PRODUCT_URL}"><i class="fas fa-calendar-check"></i><span><strong>Book a service</strong><small>Car and home cleaning</small></span><i class="fas fa-chevron-right"></i></a>
                <a href="https://vbo.co.in/kwikkwash/teamlogin/"><i class="fas fa-briefcase"></i><span><strong>Corporate login</strong><small>Team access</small></span><i class="fas fa-chevron-right"></i></a>
            </nav>
        `;
        document.getElementById("kwaMenuSignin").addEventListener("click", () => {
            closeDrawer();
            renderIdentifier({ forcePhone: true, compact: true });
            openModal();
        });
        openDrawer();
    }

    function updateAccountButton() {
        const button = document.getElementById("kwaAccountButton");
        if (!button) return;
        const label = button.querySelector(".kwa-account-label");
        const icon = button.querySelector(".kwa-account-icon");
        if (state.user) {
            label.textContent = state.user.name?.split(" ")[0] || "My account";
            icon.innerHTML = avatarContent();
            button.classList.add("is-signed-in");
        } else {
            label.textContent = IS_HOME_PAGE ? "Menu" : "Sign in";
            icon.innerHTML = `<i class="fas ${IS_HOME_PAGE ? "fa-bars" : "fa-user"}"></i>`;
            button.classList.remove("is-signed-in");
        }
    }

    function openModal() {
        closeDrawer();
        document.getElementById("kwaModal")?.classList.add("is-open");
        document.body.classList.add("kwa-modal-open");
    }

    function closeModal(triggerOffer = true, preserveBookingFlow = false) {
        const showOfferAfterClose = triggerOffer && IS_HOME_PAGE && state.homePromptActive;
        state.homePromptActive = false;
        document.getElementById("kwaModal")?.classList.remove("is-open");
        document.getElementById("kwaModal")?.classList.remove("is-compact-auth");
        document.body.classList.remove("kwa-modal-open");
        if (!preserveBookingFlow && state.bookingResolver && !(state.user?.phone_verified && state.user?.name)) {
            state.bookingResolver(null);
            state.bookingResolver = null;
        }
        if (showOfferAfterClose) setTimeout(showHomeOfferIfEligible, 250);
    }

    function showHomeOffer() {
        if (!IS_HOME_PAGE || state.homeOfferHandled) return;
        const shown = window.KwikkwashPromo?.show(state.user?.user_id || "guest");
        state.homeOfferHandled = shown !== false;
    }

    async function showHomeOfferIfEligible() {
        if (!IS_HOME_PAGE || state.homeOfferHandled) return;
        if (!state.user) return showHomeOffer();
        try {
            const response = await authFetch("/booking-eligibility");
            const data = await response.json().catch(() => ({}));
            if (response.ok && data.eligible) showHomeOffer();
        } catch (error) { /* signed-in customers only see confirmed eligible offers */ }
    }

    function openHomeVerification() {
        if (!IS_HOME_PAGE || state.user) return;
        state.homePromptActive = true;
        renderIdentifier({ forcePhone: true, compact: true });
        document.getElementById("kwaModal")?.classList.add("is-compact-auth");
        openModal();
    }

    function showPrompt() {
        if (state.user) return;
        const dismissedUntil = Number(localStorage.getItem(PROMPT_KEY) || 0);
        if (dismissedUntil > Date.now()) return;
        document.getElementById("kwaSigninPrompt")?.classList.add("is-visible");
    }

    function hidePrompt() {
        document.getElementById("kwaSigninPrompt")?.classList.remove("is-visible");
    }

    function dismissPrompt() {
        localStorage.setItem(PROMPT_KEY, String(Date.now() + PROMPT_DISMISS_MS));
        hidePrompt();
    }

    function modalBody() {
        return document.getElementById("kwaModalBody");
    }

    function setInlineMessage(message, type = "error") {
        const node = document.getElementById("kwaInlineMessage");
        if (!node) return;
        node.textContent = message || "";
        node.className = `kwa-inline-message ${message ? "is-visible" : ""} is-${type}`;
    }

    function setBusy(button, busy, label) {
        if (!button) return;
        if (!button.dataset.label) button.dataset.label = button.innerHTML;
        button.disabled = busy;
        button.innerHTML = busy ? `<i class="fas fa-spinner fa-spin"></i> ${escapeHtml(label || "Please wait")}` : button.dataset.label;
    }

    function renderIdentifier(options = {}) {
        state.challenge = null;
        state.otpRequesting = false;
        clearTimeout(state.autoOtpTimer);
        const forcePhone = Boolean(options.forcePhone);
        const compact = Boolean(options.compact);
        state.compactAuth = compact;
        state.authType = "phone";
        document.getElementById("kwaModal")?.classList.toggle("is-compact-auth", compact);
        const prefill = options.identifier || "";
        modalBody().innerHTML = `
            <div class="kwa-auth-heading ${compact ? "kwa-auth-heading-compact" : ""}">
                ${compact ? "" : `<span class="kwa-eyebrow">KWIKKWASH ACCOUNT</span>`}
                <h2 id="kwaModalTitle">${compact ? "Your mobile number ?" : (state.user ? "Verify another contact" : "Sign in or create account")}</h2>
                ${compact ? "" : `<p>${forcePhone ? "A verified mobile number is required to confirm a doorstep booking." : "Continue securely with a one-time verification code."}</p>`}
            </div>
            <form id="kwaIdentifierForm" class="kwa-form">
                <label for="kwaIdentifier">Mobile number</label>
                <div class="kwa-input-wrap">
                    <input id="kwaIdentifier" type="tel"
                        inputmode="numeric"
                        maxlength="10"
                        value="${escapeHtml(prefill)}"
                        pattern="[6-9][0-9]{9}"
                        placeholder="10-digit mobile number" autocomplete="tel-national" required>
                </div>
                <div id="kwaChannelArea" class="kwa-channel-area"></div>
                <p id="kwaInlineMessage" class="kwa-inline-message" role="alert"></p>
                <p class="kwa-privacy-note"><i class="fas fa-lock"></i> Your contact is used for account and booking communication.</p>
            </form>
        `;
        const input = document.getElementById("kwaIdentifier");
        input.addEventListener("input", () => {
            input.value = input.value.replace(/\D/g, "").slice(0, 10);
            setInlineMessage("");
            if (input.value.length === 10) queueAutomaticOtp();
            else clearTimeout(state.autoOtpTimer);
        });
        document.getElementById("kwaIdentifierForm").addEventListener("submit", handleRequestOtp);
        refreshChannels().then(() => {
            if (input.value.length === 10) queueAutomaticOtp(100);
        });
        setTimeout(() => input.focus(), 60);
    }

    function queueAutomaticOtp(delay = 320) {
        clearTimeout(state.autoOtpTimer);
        state.autoOtpTimer = setTimeout(() => {
            const input = document.getElementById("kwaIdentifier");
            const channel = document.querySelector('input[name="kwaChannel"]:checked');
            if (!input || input.value.length !== 10 || !input.checkValidity() || !channel || state.otpRequesting) return;
            handleRequestOtp();
        }, delay);
    }

    async function refreshChannels() {
        const area = document.getElementById("kwaChannelArea");
        if (!area) return;
        area.innerHTML = `<div class="kwa-channel-loading"><i class="fas fa-spinner fa-spin"></i> Checking options...</div>`;
        try {
            const identifier = document.getElementById("kwaIdentifier")?.value.trim();
            const query = identifier ? `?identifier=${encodeURIComponent(identifier)}` : "";
            const response = await fetch(`${API_ROOT}/options${query}`);
            const data = await response.json();
            const source = data.channels || {};
            const entries = [
                ["whatsapp", { ...(source.whatsapp || {}), label: "WhatsApp", enabled: false, reason: "Coming soon" }],
                ["sms", { ...(source.sms || {}), label: "Text message", enabled: Boolean(source.sms?.enabled) }],
            ];
            area.innerHTML = entries.map(([key, item], index) => `
                <label class="kwa-channel ${item.enabled ? "" : "is-disabled"}" aria-label="${escapeHtml(item.label)}${item.reason ? ` - ${escapeHtml(item.reason)}` : ""}" title="${escapeHtml(item.label)}${item.reason ? ` - ${escapeHtml(item.reason)}` : ""}">
                    <input type="radio" name="kwaChannel" value="${key}" ${item.enabled && !entries.slice(0, index).some(([, previous]) => previous.enabled) ? "checked" : ""} ${item.enabled ? "" : "disabled"}>
                    <span class="kwa-channel-icon"><i class="fab fa-whatsapp"></i></span>
                    <span><strong>${escapeHtml(item.label)}</strong>${item.reason ? `<small>${escapeHtml(item.reason)}</small>` : ""}</span>
                </label>
            `).join("");
            area.querySelectorAll(".kwa-channel").forEach(label => {
                const value = label.querySelector("input")?.value;
                const icon = label.querySelector("i");
                if (value === "sms") icon.className = "fas fa-comment-dots";
                if (value === "email") icon.className = "fas fa-envelope";
            });
            area.querySelectorAll('input[name="kwaChannel"]').forEach(input => {
                input.addEventListener("change", () => queueAutomaticOtp(120));
            });
        } catch (error) {
            area.innerHTML = `<p class="kwa-option-error">Verification options could not be loaded.</p>`;
        }
    }

    async function handleRequestOtp(event) {
        event?.preventDefault();
        if (state.otpRequesting) return;
        const identifierInput = document.getElementById("kwaIdentifier");
        const identifier = identifierInput.value.trim();
        const channel = document.querySelector('input[name="kwaChannel"]:checked')?.value;
        if (!identifierInput.checkValidity()) {
            identifierInput.reportValidity();
            return;
        }
        if (!channel) {
            setInlineMessage("Choose an available verification method.");
            return;
        }
        state.otpRequesting = true;
        clearTimeout(state.autoOtpTimer);
        setInlineMessage("");
        setInlineMessage("Sending OTP...", "success");
        identifierInput.disabled = true;
        document.querySelectorAll('input[name="kwaChannel"]').forEach(input => { input.disabled = true; });
        try {
            const response = await fetch(`${API_ROOT}/request-otp`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ identifier, channel }),
            });
            const data = await response.json().catch(() => ({}));
            if (!response.ok) throw new Error(apiMessage(data, "Code could not be sent"));
            state.challenge = { ...data, identifier, channel };
            renderOtp();
        } catch (error) {
            setInlineMessage(error.message);
        } finally {
            state.otpRequesting = false;
            if (identifierInput.isConnected) {
                identifierInput.disabled = false;
                document.querySelectorAll('input[name="kwaChannel"]').forEach(input => {
                    input.disabled = input.closest(".kwa-channel")?.classList.contains("is-disabled") || false;
                });
                identifierInput.focus();
            }
        }
    }

    function otpDeliveryMessage(channel) {
        if (channel === "whatsapp") return "Please check WhatsApp.";
        if (channel === "email") return "Please check your email (including junk or spam folders too).";
        return "Please check your text messages.";
    }

    function renderOtp() {
        const challenge = state.challenge;
        state.otpSubmitting = false;
        modalBody().innerHTML = `
            <div class="kwa-auth-heading ${state.compactAuth ? "kwa-auth-heading-compact" : ""}">
                ${state.compactAuth ? "" : `<span class="kwa-eyebrow">VERIFY CONTACT</span>`}
                <h2 id="kwaModalTitle">Enter OTP</h2>
                <p>${escapeHtml(otpDeliveryMessage(challenge.channel))}</p>
            </div>
            <form id="kwaOtpForm" class="kwa-form">
                <input id="kwaOtp" class="kwa-otp-input" type="text" inputmode="numeric" maxlength="6" pattern="[0-9]{6}" autocomplete="one-time-code" placeholder="000000" required>
                <p id="kwaInlineMessage" class="kwa-inline-message" role="alert"></p>
                <div class="kwa-secondary-actions">
                    <button id="kwaChangeContact" type="button">Change contact</button>
                    <button id="kwaResendOtp" type="button" disabled>Resend in <span>${challenge.resend_after || 60}</span>s</button>
                </div>
            </form>
        `;
        document.getElementById("kwaOtpForm").addEventListener("submit", handleVerifyOtp);
        document.getElementById("kwaChangeContact").addEventListener("click", () => renderIdentifier({ type: state.authType, identifier: challenge.identifier.replace(/^\+91/, ""), compact: state.compactAuth }));
        document.getElementById("kwaResendOtp").addEventListener("click", () => renderIdentifier({ type: state.authType, identifier: challenge.identifier.replace(/^\+91/, ""), compact: state.compactAuth }));
        const input = document.getElementById("kwaOtp");
        input.addEventListener("input", () => {
            input.value = input.value.replace(/\D/g, "").slice(0, 6);
            if (input.value.length === 6) handleVerifyOtp();
            else setInlineMessage("");
        });
        let remaining = challenge.resend_after || 60;
        const timer = setInterval(() => {
            const button = document.getElementById("kwaResendOtp");
            if (!button) return clearInterval(timer);
            remaining -= 1;
            button.querySelector("span").textContent = Math.max(remaining, 0);
            if (remaining <= 0) {
                clearInterval(timer);
                button.disabled = false;
                button.textContent = "Resend code";
            }
        }, 1000);
        setTimeout(() => input.focus(), 60);
    }

    async function handleVerifyOtp(event) {
        event?.preventDefault();
        const input = document.getElementById("kwaOtp");
        if (!input || input.value.length !== 6 || state.otpSubmitting) return;
        state.otpSubmitting = true;
        input.disabled = true;
        setInlineMessage("Verifying code...", "success");
        let verified = false;
        try {
            const response = await authFetch("/verify-otp", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    challenge_id: state.challenge.challenge_id,
                    identifier: state.challenge.identifier,
                    channel: state.challenge.channel,
                    otp: input.value,
                }),
            });
            const data = await response.json().catch(() => ({}));
            if (!response.ok) throw new Error(apiMessage(data, "Verification failed"));
            verified = true;
            storeTokens(data);
            state.user = data.customer;
            state.isNewCustomer = Boolean(data.is_new_customer);
            updateAccountButton();
            syncBookingFields();
            if (IS_HOME_PAGE && state.homePromptActive) {
                state.homePromptActive = false;
                closeModal();
                await showHomeOfferIfEligible();
                return;
            }
            if (!state.user.name) renderProfileCompletion();
            else finishAuthentication();
        } catch (error) {
            setInlineMessage(error.message);
            input.value = "";
        } finally {
            state.otpSubmitting = false;
            if (!verified && input.isConnected) {
                input.disabled = false;
                input.focus();
            }
        }
    }

    function renderProfileCompletion({ inDrawer = true } = {}) {
        const address = state.user?.addresses?.find(item => item.is_default) || {};
        const editingProfile = Boolean(state.user?.name);
        const profileContent = `
            <div class="kwa-auth-heading">
                <span class="kwa-eyebrow">${editingProfile ? "EDIT PROFILE" : "COMPLETE PROFILE"}</span>
                <h2 id="kwaModalTitle">${editingProfile ? "Your profile" : "Welcome to Kwikkwash"}</h2>
                <p>${editingProfile ? "Keep your personal details and default address up to date." : "Add your name now. Your address can be saved here or automatically after your first booking."}</p>
            </div>
            <form id="kwaProfileForm" class="kwa-form">
                <div class="kwa-avatar-editor">
                    <div id="kwaAvatarPreview" class="kwa-avatar kwa-avatar-preview">${avatarContent()}</div>
                    <div class="kwa-avatar-options">
                        <span>Choose an avatar</span>
                        <div class="kwa-avatar-presets">
                            ${Object.entries(AVATAR_PRESETS).map(([key, label]) => `
                                <button class="${(state.user?.avatar_type === "preset" && state.user.avatar_value === key) || (key === "crown" && !state.user?.avatar_type) ? "is-selected" : ""}" type="button" data-avatar-preset="${key}" aria-label="Choose ${escapeHtml(label)} avatar">${key === "crown" ? `<i class="fas fa-crown kwa-default-crown" aria-hidden="true"></i>` : `<span class="kwa-preset-avatar kwa-preset-${key}" aria-hidden="true"></span>`}</button>
                            `).join("")}
                            <label class="kwa-avatar-upload" for="kwaAvatarFile"><i class="fas fa-camera"></i><span>Photo</span></label>
                            <input id="kwaAvatarFile" type="file" accept="image/jpeg,image/png,image/webp" hidden>
                        </div>
                    </div>
                </div>
                <label for="kwaProfileName">Full name</label>
                <input id="kwaProfileName" type="text" maxlength="150" value="${escapeHtml(state.user?.name || "")}" autocomplete="name" required>
                <label for="kwaProfileAddress">Default address <small>(optional)</small></label>
                <div class="kwa-address-row">
                    <textarea id="kwaProfileAddress" rows="3" minlength="10" maxlength="1000" placeholder="Your complete address">${escapeHtml(address.address || "")}</textarea>
                    <button id="kwaDetectLocation" type="button"><i class="fas fa-location-crosshairs"></i> Detect</button>
                </div>
                <input id="kwaProfileLat" type="hidden" value="${escapeHtml(address.lat ?? "")}">
                <input id="kwaProfileLng" type="hidden" value="${escapeHtml(address.lng ?? "")}">
                <label class="kwa-consent">
                    <input id="kwaMarketingConsent" type="checkbox" ${editingProfile ? (state.user?.marketing_consent ? "checked" : "") : "checked"}>
                    <span class="kwa-consent-box" aria-hidden="true"><i class="fas fa-check"></i></span>
                    <span>Send me relevant offers and updates. I can turn this off later.</span>
                </label>
                <p id="kwaInlineMessage" class="kwa-inline-message" role="alert"></p>
                <button id="kwaSaveProfile" class="kwa-primary-button" type="submit">Save and continue</button>
            </form>
        `;
        if (inDrawer) {
            drawerBody().innerHTML = `<div class="kwa-profile-editor-drawer">${profileContent}</div>`;
            closeModal(false, true);
            openDrawer({ preserveBookingFlow: true });
        } else {
            modalBody().innerHTML = profileContent;
        }
        document.querySelectorAll("[data-avatar-preset]").forEach(button => {
            button.addEventListener("click", () => saveAvatar({ preset: button.dataset.avatarPreset }, button));
        });
        document.getElementById("kwaAvatarFile").addEventListener("change", handleAvatarFile);
        document.getElementById("kwaDetectLocation").addEventListener("click", detectProfileLocation);
        document.getElementById("kwaProfileForm").addEventListener("submit", saveProfile);
    }

    function prepareAvatarImage(file) {
        return new Promise((resolve, reject) => {
            if (!file || !["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
                reject(new Error("Choose a JPG, PNG or WebP profile picture."));
                return;
            }
            if (file.size > 10 * 1024 * 1024) {
                reject(new Error("Choose a profile picture smaller than 10 MB."));
                return;
            }
            const image = new Image();
            const objectUrl = URL.createObjectURL(file);
            image.onload = () => {
                const cropper = document.getElementById("kwaCropper");
                const canvas = document.getElementById("kwaCropCanvas");
                const zoomInput = document.getElementById("kwaCropZoom");
                const context = canvas.getContext("2d");
                const viewSize = canvas.width;
                const baseScale = Math.max(viewSize / image.naturalWidth, viewSize / image.naturalHeight);
                let zoom = 1;
                let offsetX = 0;
                let offsetY = 0;
                let dragging = false;
                let lastX = 0;
                let lastY = 0;
                let settled = false;

                const clampPosition = () => {
                    const width = image.naturalWidth * baseScale * zoom;
                    const height = image.naturalHeight * baseScale * zoom;
                    offsetX = Math.max((viewSize - width) / 2, Math.min((width - viewSize) / 2, offsetX));
                    offsetY = Math.max((viewSize - height) / 2, Math.min((height - viewSize) / 2, offsetY));
                };
                const draw = () => {
                    clampPosition();
                    const width = image.naturalWidth * baseScale * zoom;
                    const height = image.naturalHeight * baseScale * zoom;
                    context.clearRect(0, 0, viewSize, viewSize);
                    context.drawImage(image, (viewSize - width) / 2 + offsetX, (viewSize - height) / 2 + offsetY, width, height);
                };
                const finish = value => {
                    if (settled) return;
                    settled = true;
                    cropper.classList.remove("is-open");
                    URL.revokeObjectURL(objectUrl);
                    resolve(value);
                };
                const cancel = () => finish(null);

                zoomInput.value = "1";
                zoomInput.oninput = () => {
                    zoom = Number(zoomInput.value) || 1;
                    draw();
                };
                canvas.onpointerdown = event => {
                    dragging = true;
                    lastX = event.clientX;
                    lastY = event.clientY;
                    canvas.setPointerCapture(event.pointerId);
                    canvas.classList.add("is-dragging");
                };
                canvas.onpointermove = event => {
                    if (!dragging) return;
                    const scale = viewSize / canvas.getBoundingClientRect().width;
                    offsetX += (event.clientX - lastX) * scale;
                    offsetY += (event.clientY - lastY) * scale;
                    lastX = event.clientX;
                    lastY = event.clientY;
                    draw();
                };
                canvas.onpointerup = event => {
                    dragging = false;
                    canvas.classList.remove("is-dragging");
                    if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
                };
                document.getElementById("kwaCropCancel").onclick = cancel;
                document.getElementById("kwaCropCancelTop").onclick = cancel;
                document.getElementById("kwaCropApply").onclick = () => {
                    try {
                        const output = document.createElement("canvas");
                        output.width = 256;
                        output.height = 256;
                        output.getContext("2d").drawImage(canvas, 0, 0, 256, 256);
                        finish(output.toDataURL("image/jpeg", 0.84));
                    } catch (error) {
                        settled = true;
                        cropper.classList.remove("is-open");
                        URL.revokeObjectURL(objectUrl);
                        reject(new Error("Profile picture could not be prepared."));
                    }
                };
                draw();
                cropper.classList.add("is-open");
            };
            image.onerror = () => {
                try {
                    URL.revokeObjectURL(objectUrl);
                } catch (error) { /* already released */ }
                reject(new Error("Profile picture could not be opened."));
            };
            image.src = objectUrl;
        });
    }

    async function handleAvatarFile(event) {
        const input = event.currentTarget;
        setInlineMessage("");
        input.disabled = true;
        try {
            const imageData = await prepareAvatarImage(input.files?.[0]);
            if (!imageData) return;
            await saveAvatar({ image_data: imageData });
        } catch (error) {
            setInlineMessage(error.message);
        } finally {
            input.disabled = false;
            input.value = "";
        }
    }

    async function saveAvatar(payload, button = null) {
        setInlineMessage("");
        setBusy(button, true, "Saving");
        try {
            const response = await authFetch("/avatar", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });
            const data = await response.json().catch(() => ({}));
            if (!response.ok) throw new Error(apiMessage(data, "Profile picture could not be saved"));
            state.user = data.customer;
            const preview = document.getElementById("kwaAvatarPreview");
            if (preview) preview.innerHTML = avatarContent();
            document.querySelectorAll("[data-avatar-preset]").forEach(item => {
                item.classList.toggle("is-selected", state.user.avatar_type === "preset" && state.user.avatar_value === item.dataset.avatarPreset);
            });
            updateAccountButton();
            setInlineMessage("Profile picture saved.", "success");
        } catch (error) {
            setInlineMessage(error.message);
            throw error;
        } finally {
            setBusy(button, false);
        }
    }

    function ensureGoogleMapsForProfile() {
        if (window.google?.maps?.Geocoder) return Promise.resolve(true);
        return new Promise(resolve => {
            const startedAt = Date.now();
            let script = document.querySelector('script[src*="maps.googleapis.com/maps/api/js"]');
            const finishWhenReady = () => {
                if (window.google?.maps?.Geocoder) return resolve(true);
                if (Date.now() - startedAt >= 10000) return resolve(false);
                setTimeout(finishWhenReady, 120);
            };
            if (!script) {
                script = document.createElement("script");
                script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(GOOGLE_MAPS_API_KEY)}&libraries=places,geometry&v=weekly`;
                script.async = true;
                script.defer = true;
                script.onerror = () => resolve(false);
                document.head.appendChild(script);
            }
            finishWhenReady();
        });
    }

    async function reverseGeocodeProfileLocation(lat, lng) {
        if (typeof window.reverseGeocodeLocation === "function") {
            try {
                const result = await window.reverseGeocodeLocation(lat, lng);
                if (result?.formattedAddress) return result.formattedAddress;
            } catch (error) { /* use the on-demand geocoder below */ }
        }
        if (!(await ensureGoogleMapsForProfile())) return "";
        try {
            const geocoder = new window.google.maps.Geocoder();
            const response = await geocoder.geocode({ location: { lat, lng } });
            return response.results?.[0]?.formatted_address || "";
        } catch (error) {
            return "";
        }
    }

    async function detectProfileLocation() {
        const button = document.getElementById("kwaDetectLocation");
        if (!navigator.geolocation) return setInlineMessage("Location detection is not supported on this device.");
        setBusy(button, true, "Detecting");
        setInlineMessage("");
        navigator.geolocation.getCurrentPosition(async position => {
            const lat = position.coords.latitude;
            const lng = position.coords.longitude;
            let address = "";
            try {
                address = await Promise.race([
                    reverseGeocodeProfileLocation(lat, lng),
                    new Promise(resolve => setTimeout(() => resolve(""), 12000)),
                ]);
            } catch (error) { /* coordinates remain usable */ }
            document.getElementById("kwaProfileLat").value = lat;
            document.getElementById("kwaProfileLng").value = lng;
            if (address) {
                document.getElementById("kwaProfileAddress").value = address;
                setInlineMessage("Address detected.", "success");
            } else {
                setInlineMessage("Your location was detected, but the address could not be found. Please enter your full address.");
                document.getElementById("kwaProfileAddress").focus();
            }
            setBusy(button, false);
        }, error => {
            setBusy(button, false);
            setInlineMessage(error.code === 1 ? "Allow location permission or enter the address manually." : "Location could not be detected.");
        }, { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 });
    }

    async function saveProfile(event) {
        event.preventDefault();
        const button = document.getElementById("kwaSaveProfile");
        const addressInput = document.getElementById("kwaProfileAddress");
        const address = addressInput.value.trim();
        setInlineMessage("");
        if (address && address.length < 10) {
            setInlineMessage("Please provide your full address (at least 10 characters).");
            addressInput.focus();
            return;
        }
        setBusy(button, true, "Saving");
        try {
            let response = await authFetch("/profile", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: document.getElementById("kwaProfileName").value.trim(),
                    marketing_consent: document.getElementById("kwaMarketingConsent").checked,
                }),
            });
            let data = await response.json().catch(() => ({}));
            if (!response.ok) throw new Error(apiMessage(data, "Profile could not be saved"));
            state.user = data.customer;

            if (address) {
                const existing = state.user.addresses?.find(item => item.is_default);
                response = await authFetch(existing ? `/addresses/${existing.address_id}` : "/addresses", {
                    method: existing ? "PUT" : "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        label: "Home",
                        address,
                        lat: Number(document.getElementById("kwaProfileLat").value) || null,
                        lng: Number(document.getElementById("kwaProfileLng").value) || null,
                        is_default: true,
                    }),
                });
                data = await response.json().catch(() => ({}));
                if (!response.ok) throw new Error(apiMessage(data, "Address could not be saved"));
            }
            await loadMe();
            state.isNewCustomer = false;
            finishAuthentication();
        } catch (error) {
            setInlineMessage(error.message);
        } finally {
            setBusy(button, false);
        }
    }

    function finishAuthentication() {
        updateAccountButton();
        syncBookingFields();
        if (state.bookingResolver && state.user?.phone_verified && state.user?.name) {
            const resolve = state.bookingResolver;
            state.bookingResolver = null;
            closeModal();
            closeDrawer();
            resolve(state.user);
        } else {
            renderAccount();
        }
    }

    async function renderAccount() {
        drawerBody().innerHTML = `<div class="kwa-account-loading"><i class="fas fa-spinner fa-spin"></i> Loading your account...</div>`;
        openDrawer();
        await loadMe();
        if (!state.user) return renderGuestMenu();
        let bookings = [];
        let offers = [];
        try {
            const [bookingResponse, offerResponse] = await Promise.all([authFetch("/bookings"), authFetch("/offers")]);
            bookings = (await bookingResponse.json()).bookings || [];
            offers = (await offerResponse.json()).offers || [];
        } catch (error) { /* profile remains available */ }
        const defaultAddress = state.user.addresses?.find(item => item.is_default);
        const readinessConsents = Array.isArray(state.user.service_requirement_consents)
            ? state.user.service_requirement_consents
            : [];
        const preferenceLabel = [state.user.preferred_city, state.user.preferred_vehicle_type]
            .filter(Boolean)
            .map(value => String(value).replace(/\b\w/g, character => character.toUpperCase()))
            .join(" · ");
        drawerBody().innerHTML = `
            <section class="kwa-profile-badge">
                <div class="kwa-profile-badge-glow"></div>
                <div class="kwa-avatar kwa-profile-badge-avatar">${avatarContent()}<span class="kwa-profile-online" aria-label="Active account"></span></div>
                <div class="kwa-profile-badge-copy">
                    <span class="kwa-eyebrow">KWIKKWASH MEMBER</span>
                    <h2>${escapeHtml(state.user.name || "Your account")}</h2>
                    <p><i class="fas fa-circle-check"></i> ${state.user.phone_verified ? "Verified mobile" : "Account active"}</p>
                </div>
                <button id="kwaEditProfile" class="kwa-profile-edit" type="button" aria-label="Edit profile"><i class="fas fa-pen"></i></button>
            </section>
            <div class="kwa-profile-summary">
                <div><i class="fas fa-mobile-screen"></i><span><small>Mobile</small><strong>${escapeHtml(state.user.phone || "Not added")}</strong></span></div>
                <div><i class="fas fa-car-side"></i><span><small>Saved selection</small><strong>${escapeHtml(preferenceLabel || "Choose city and vehicle")}</strong></span></div>
                <div><i class="fas fa-location-dot"></i><span><small>Address</small><strong>${escapeHtml(defaultAddress?.address || "Add your address")}</strong></span></div>
                <div><i class="fas fa-handshake-angle"></i><span><small>Service readiness</small><strong>${escapeHtml(readinessConsents.length ? readinessConsents.join(" · ") : "Confirm during service selection")}</strong></span></div>
            </div>
            <section class="kwa-account-section">
                <h3>Previous bookings <span>${bookings.length}</span></h3>
                <div class="kwa-booking-list">
                    ${bookings.length ? bookings.slice(0, 3).map(booking => `
                        <article><div><strong>${escapeHtml(booking.booking_id)}</strong><small>${escapeHtml(booking.booking_date || "")}</small></div><span>${escapeHtml(booking.status || "pending")}</span></article>
                    `).join("") : `<p class="kwa-empty">Your bookings will appear here.</p>`}
                </div>
            </section>
            <section class="kwa-account-section">
                <h3>Exclusive offers <span>${offers.length}</span></h3>
                ${offers.length ? offers.map(offer => `<a class="kwa-offer" href="${PRODUCT_URL}"><span><strong>${escapeHtml(offer.title)}</strong><p>${escapeHtml(offer.description || "")}</p>${offer.code ? `<code>${escapeHtml(offer.code)}</code>` : ""}</span><i class="fas fa-arrow-right"></i></a>`).join("") : `<p class="kwa-empty">Fresh offers will appear here when available.</p>`}
            </section>
            <nav class="kwa-menu-links kwa-member-links" aria-label="Account links">
                <a href="${PRODUCT_URL}"><i class="fas fa-calendar-check"></i><span><strong>Book a service</strong><small>Choose a service and slot</small></span><i class="fas fa-chevron-right"></i></a>
                <a href="https://vbo.co.in/kwikkwash/teamlogin/"><i class="fas fa-briefcase"></i><span><strong>Corporate login</strong><small>Team access</small></span><i class="fas fa-chevron-right"></i></a>
            </nav>
            <div class="kwa-logout-row">
                <button id="kwaLogout" type="button">Logout</button>
                <button id="kwaLogoutAll" type="button">Logout all devices</button>
            </div>
            <button id="kwaDeleteAccount" class="kwa-delete-account" type="button"><i class="fas fa-trash-can"></i> Delete account</button>
        `;
        document.getElementById("kwaEditProfile").addEventListener("click", () => {
            renderProfileCompletion({ inDrawer: true });
        });
        document.getElementById("kwaLogout").addEventListener("click", () => logout(false));
        document.getElementById("kwaLogoutAll").addEventListener("click", () => logout(true));
        document.getElementById("kwaDeleteAccount").addEventListener("click", () => renderAccountDeletionWarning(bookings));
    }

    function activeBookingCount(bookings) {
        const terminal = new Set(["completed", "complete", "cancelled", "canceled", "rejected"]);
        return (bookings || []).filter(booking => !terminal.has(String(booking.status || "pending").trim().toLowerCase())).length;
    }

    function renderAccountDeletionWarning(bookings = []) {
        state.deletionFlow = {
            reason: "",
            activeBookingCount: activeBookingCount(bookings),
            challenge: null,
            deletionToken: "",
        };
        closeDrawer();
        const activeWarning = state.deletionFlow.activeBookingCount
            ? `<div class="kwa-delete-alert"><i class="fas fa-triangle-exclamation"></i><span>You have ${state.deletionFlow.activeBookingCount} active or upcoming booking${state.deletionFlow.activeBookingCount === 1 ? "" : "s"}. They will remain active after account deletion.</span></div>`
            : "";
        modalBody().innerHTML = `
            <div class="kwa-auth-heading kwa-delete-heading">
                <span class="kwa-eyebrow">PERMANENT ACTION</span>
                <h2 id="kwaModalTitle">Delete your account?</h2>
                <p>Your profile, saved addresses, login sessions, offers and profile picture will be removed permanently.</p>
            </div>
            <form id="kwaDeleteWarningForm" class="kwa-form">
                ${activeWarning}
                <div class="kwa-delete-retained"><i class="fas fa-file-shield"></i><span>Booking and invoice records will remain unchanged for operational purposes.</span></div>
                <label for="kwaDeleteReason">Reason (optional)</label>
                <textarea id="kwaDeleteReason" maxlength="500" rows="3" placeholder="Tell us why you are leaving"></textarea>
                <p id="kwaInlineMessage" class="kwa-inline-message" role="alert"></p>
                <button id="kwaDeleteSendOtp" class="kwa-danger-button" type="submit">Continue with OTP</button>
                <button id="kwaDeleteCancel" class="kwa-neutral-button" type="button">Keep my account</button>
            </form>
        `;
        document.getElementById("kwaDeleteWarningForm").addEventListener("submit", requestAccountDeletionOtp);
        document.getElementById("kwaDeleteCancel").addEventListener("click", closeModal);
        openModal();
    }

    async function requestAccountDeletionOtp(event) {
        event?.preventDefault();
        const reasonInput = document.getElementById("kwaDeleteReason");
        if (reasonInput) state.deletionFlow.reason = reasonInput.value.trim();
        const button = document.getElementById("kwaDeleteSendOtp") || document.getElementById("kwaDeleteResendOtp");
        setBusy(button, true, "Sending OTP");
        setInlineMessage("");
        try {
            const response = await authFetch("/delete-account/request-otp", { method: "POST" });
            const data = await response.json().catch(() => ({}));
            if (!response.ok) throw new Error(apiMessage(data, "Deletion OTP could not be sent"));
            state.deletionFlow.challenge = data;
            state.deletionFlow.activeBookingCount = Number(data.active_booking_count || 0);
            renderAccountDeletionOtp();
        } catch (error) {
            setInlineMessage(error.message);
        } finally {
            setBusy(button, false);
        }
    }

    function renderAccountDeletionOtp() {
        const challenge = state.deletionFlow.challenge;
        state.deletionSubmitting = false;
        modalBody().innerHTML = `
            <div class="kwa-auth-heading kwa-delete-heading">
                <span class="kwa-eyebrow">CONFIRM YOUR IDENTITY</span>
                <h2 id="kwaModalTitle">Enter the 6-digit code</h2>
                <p>Deletion OTP sent by text message to <strong>${escapeHtml(challenge.sent_to)}</strong>.</p>
            </div>
            <form id="kwaDeleteOtpForm" class="kwa-form">
                <input id="kwaDeleteOtp" class="kwa-otp-input" type="text" inputmode="numeric" maxlength="6" pattern="[0-9]{6}" autocomplete="one-time-code" placeholder="000000" required>
                <p id="kwaInlineMessage" class="kwa-inline-message" role="alert"></p>
                <div class="kwa-secondary-actions">
                    <button id="kwaDeleteOtpCancel" type="button">Cancel deletion</button>
                    <button id="kwaDeleteResendOtp" type="button" disabled>Resend in <span>${challenge.resend_after || 60}</span>s</button>
                </div>
            </form>
        `;
        document.getElementById("kwaDeleteOtpForm").addEventListener("submit", verifyAccountDeletionOtp);
        document.getElementById("kwaDeleteOtpCancel").addEventListener("click", closeModal);
        const input = document.getElementById("kwaDeleteOtp");
        input.addEventListener("input", () => {
            input.value = input.value.replace(/\D/g, "").slice(0, 6);
            if (input.value.length === 6) verifyAccountDeletionOtp();
            else setInlineMessage("");
        });
        let remaining = challenge.resend_after || 60;
        const timer = setInterval(() => {
            const button = document.getElementById("kwaDeleteResendOtp");
            if (!button) return clearInterval(timer);
            remaining -= 1;
            button.querySelector("span").textContent = Math.max(remaining, 0);
            if (remaining <= 0) {
                clearInterval(timer);
                button.disabled = false;
                button.textContent = "Resend code";
                button.onclick = requestAccountDeletionOtp;
            }
        }, 1000);
        setTimeout(() => input.focus(), 60);
    }

    async function verifyAccountDeletionOtp(event) {
        event?.preventDefault();
        const input = document.getElementById("kwaDeleteOtp");
        if (!input || input.value.length !== 6 || state.deletionSubmitting) return;
        state.deletionSubmitting = true;
        input.disabled = true;
        setInlineMessage("Verifying code...", "success");
        let verified = false;
        try {
            const response = await authFetch("/delete-account/verify-otp", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ challenge_id: state.deletionFlow.challenge.challenge_id, otp: input.value }),
            });
            const data = await response.json().catch(() => ({}));
            if (!response.ok) throw new Error(apiMessage(data, "Verification failed"));
            verified = true;
            state.deletionFlow.deletionToken = data.deletion_token;
            renderAccountDeletionFinal();
        } catch (error) {
            setInlineMessage(error.message);
            input.value = "";
        } finally {
            state.deletionSubmitting = false;
            if (!verified && input.isConnected) {
                input.disabled = false;
                input.focus();
            }
        }
    }

    function renderAccountDeletionFinal() {
        const count = state.deletionFlow.activeBookingCount;
        modalBody().innerHTML = `
            <div class="kwa-auth-heading kwa-delete-heading">
                <span class="kwa-eyebrow">FINAL CONFIRMATION</span>
                <h2 id="kwaModalTitle">This cannot be undone</h2>
                <p>Type <strong>DELETE</strong> below to permanently remove your account.</p>
            </div>
            <form id="kwaDeleteConfirmForm" class="kwa-form">
                ${count ? `<div class="kwa-delete-alert"><i class="fas fa-triangle-exclamation"></i><span>${count} active or upcoming booking${count === 1 ? "" : "s"} will remain active and unchanged.</span></div>` : ""}
                <div class="kwa-delete-retained"><i class="fas fa-database"></i><span>Your booking records will not be deleted.</span></div>
                <label for="kwaDeleteConfirmation">Type DELETE</label>
                <input id="kwaDeleteConfirmation" type="text" autocomplete="off" autocapitalize="characters" placeholder="DELETE" required>
                <p id="kwaInlineMessage" class="kwa-inline-message" role="alert"></p>
                <button id="kwaDeletePermanent" class="kwa-danger-button" type="submit" disabled>Permanently delete account</button>
                <button id="kwaDeleteFinalCancel" class="kwa-neutral-button" type="button">Cancel</button>
            </form>
        `;
        const confirmation = document.getElementById("kwaDeleteConfirmation");
        const deleteButton = document.getElementById("kwaDeletePermanent");
        confirmation.addEventListener("input", () => {
            confirmation.value = confirmation.value.toUpperCase().replace(/[^A-Z]/g, "").slice(0, 6);
            deleteButton.disabled = confirmation.value !== "DELETE";
        });
        document.getElementById("kwaDeleteConfirmForm").addEventListener("submit", confirmAccountDeletion);
        document.getElementById("kwaDeleteFinalCancel").addEventListener("click", closeModal);
        setTimeout(() => confirmation.focus(), 60);
    }

    async function confirmAccountDeletion(event) {
        event.preventDefault();
        const confirmation = document.getElementById("kwaDeleteConfirmation").value;
        if (confirmation !== "DELETE") return;
        const button = document.getElementById("kwaDeletePermanent");
        setBusy(button, true, "Deleting account");
        setInlineMessage("");
        try {
            const response = await authFetch("/delete-account/confirm", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    deletion_token: state.deletionFlow.deletionToken,
                    confirmation,
                    reason: state.deletionFlow.reason || null,
                }),
            });
            const data = await response.json().catch(() => ({}));
            if (!response.ok) throw new Error(apiMessage(data, "Account could not be deleted"));
            clearTokens();
            state.deletionFlow = null;
            updateAccountButton();
            syncBookingFields();
            modalBody().innerHTML = `
                <div class="kwa-delete-success">
                    <span><i class="fas fa-check"></i></span>
                    <h2 id="kwaModalTitle">Account deleted</h2>
                    <p>Your profile has been removed permanently. Existing booking records remain unchanged.</p>
                    <button id="kwaDeleteDone" class="kwa-primary-button" type="button">Done</button>
                </div>
            `;
            document.getElementById("kwaDeleteDone").addEventListener("click", closeModal);
        } catch (error) {
            setInlineMessage(error.message);
            setBusy(button, false);
        }
    }

    async function logout(allDevices) {
        try {
            if (allDevices) {
                await authFetch("/logout-all", { method: "POST" });
            } else if (state.refreshToken) {
                await fetch(`${API_ROOT}/logout`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ refresh_token: state.refreshToken }),
                });
            }
        } finally {
            clearTokens();
            updateAccountButton();
            syncBookingFields();
            closeModal();
            closeDrawer();
        }
    }

    async function savePreferences(city, vehicleType) {
        if (!state.user) return null;
        const preferredCity = String(city || "").replace(/\s+/g, " ").trim();
        const preferredVehicleType = String(vehicleType || "").replace(/\s+/g, " ").trim().toLowerCase();
        if (
            preferredCity === String(state.user.preferred_city || "") &&
            preferredVehicleType === String(state.user.preferred_vehicle_type || "")
        ) return state.user;
        const response = await authFetch("/profile", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ preferred_city: preferredCity, preferred_vehicle_type: preferredVehicleType }),
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(apiMessage(data, "Preferences could not be saved"));
        state.user = data.customer;
        updateAccountButton();
        return state.user;
    }

    async function saveRequirementConsents(requirements = []) {
        if (!state.user) return null;
        const existing = Array.isArray(state.user.service_requirement_consents)
            ? state.user.service_requirement_consents
            : [];
        const merged = [];
        const seen = new Set();
        [...existing, ...requirements].forEach(item => {
            const value = String(item || "").replace(/\s+/g, " ").trim();
            const key = value.toLowerCase();
            if (value && !seen.has(key)) {
                seen.add(key);
                merged.push(value);
            }
        });
        const response = await authFetch("/profile", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ service_requirement_consents: merged }),
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(apiMessage(data, "Service confirmation could not be saved"));
        state.user = data.customer;
        return state.user;
    }

    async function saveAddress(payload, addressId = "") {
        const response = await authFetch(addressId ? `/addresses/${encodeURIComponent(addressId)}` : "/addresses", {
            method: addressId ? "PUT" : "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(apiMessage(data, "Address could not be saved"));
        await loadMe();
        window.dispatchEvent(new CustomEvent("kwikkwash:profile-updated", { detail: { user: state.user } }));
        return data.address;
    }

    async function deleteAddress(addressId) {
        const response = await authFetch(`/addresses/${encodeURIComponent(addressId)}`, { method: "DELETE" });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(apiMessage(data, "Address could not be deleted"));
        await loadMe();
        window.dispatchEvent(new CustomEvent("kwikkwash:profile-updated", { detail: { user: state.user } }));
        return true;
    }

    function syncBookingFields() {
        const phoneInput = document.getElementById("userPhone");
        if (phoneInput && state.user?.phone_verified && state.user.phone) {
            phoneInput.value = state.user.phone.replace(/^\+91/, "");
            phoneInput.readOnly = true;
            phoneInput.classList.add("is-verified");
        } else if (phoneInput) {
            phoneInput.readOnly = false;
            phoneInput.classList.remove("is-verified");
        }
        const addressInput = document.getElementById("userAddress");
        const defaultAddress = state.user?.addresses?.find(item => item.is_default);
        const addressValue = addressInput?.value.trim() || "";
        if (addressInput && defaultAddress && (!addressValue || addressValue.endsWith(","))) {
            addressInput.value = defaultAddress.address;
            if (defaultAddress.lat != null && defaultAddress.lng != null) {
                window.__selectedMapAddress = defaultAddress.address;
                window.__selectedMapAddressRaw = defaultAddress.address;
                window.__selectedMapCoords = { lat: defaultAddress.lat, lng: defaultAddress.lng };
            }
        }
    }

    async function requireBookingIdentity(phone) {
        const requestedPhone = String(phone || "").replace(/\D/g, "").slice(-10);
        const currentUser = await loadMe();
        const verifiedPhone = String(currentUser?.phone || "").replace(/\D/g, "").slice(-10);
        const sameVerifiedMobile = Boolean(
            currentUser?.phone_verified &&
            verifiedPhone &&
            (!requestedPhone || requestedPhone === verifiedPhone)
        );
        if (sameVerifiedMobile) {
            syncBookingFields();
            if (currentUser.name) return currentUser;
            if (state.bookingResolver) state.bookingResolver(null);
            return new Promise(resolve => {
                state.bookingResolver = resolve;
                renderProfileCompletion({ inDrawer: true });
            });
        }
        if (state.bookingResolver) state.bookingResolver(null);
        return new Promise(resolve => {
            state.bookingResolver = resolve;
            renderIdentifier({ forcePhone: true, type: "phone", identifier: requestedPhone, compact: true });
            document.getElementById("kwaModal")?.classList.add("is-compact-auth");
            openModal();
        });
    }

    async function init() {
        try {
            injectUi();
            updateAccountButton();
            await loadMe();
            if (IS_HOME_PAGE) {
                setTimeout(() => {
                    if (state.user) showHomeOfferIfEligible();
                    else openHomeVerification();
                }, PROMPT_DELAY_MS);
            }
        } finally {
            if (resolveReady) {
                resolveReady(state.user);
                resolveReady = null;
            }
        }
    }

    window.KwikkwashAuth = {
        init,
        authFetch,
        getUser: () => state.user,
        loadMe,
        whenReady: () => ready,
        savePreferences,
        saveRequirementConsents,
        saveAddress,
        deleteAddress,
        open: () => {
            if (state.user) {
                renderAccount();
                return;
            }
            renderIdentifier({ forcePhone: true, compact: true });
            openModal();
        },
        openProfile: renderAccount,
        requireBookingIdentity,
        syncBookingFields,
    };

    document.addEventListener("DOMContentLoaded", init);
})();
