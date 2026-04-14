import { createSlice } from '@reduxjs/toolkit';

const stored = (() => {
  try {
    const t = localStorage.getItem('wf_token');
    const u = localStorage.getItem('wf_user');
    return { token: t || null, user: u ? JSON.parse(u) : null };
  } catch {
    return { token: null, user: null };
  }
})();

const initialState = {
  token: stored.token,
  user: stored.user,
  bootstrapped: true,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials(state, action) {
      state.token = action.payload.token;
      state.user = action.payload.user;
      if (action.payload.token) localStorage.setItem('wf_token', action.payload.token);
      else localStorage.removeItem('wf_token');
      if (action.payload.user) localStorage.setItem('wf_user', JSON.stringify(action.payload.user));
      else localStorage.removeItem('wf_user');
    },
    logout(state) {
      state.token = null;
      state.user = null;
      localStorage.removeItem('wf_token');
      localStorage.removeItem('wf_user');
    },
  },
});

export const { setCredentials, logout } = authSlice.actions;
export default authSlice.reducer;
