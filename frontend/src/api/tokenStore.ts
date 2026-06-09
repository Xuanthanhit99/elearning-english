let accessToken = '';
let currentUser: any = null;
console.log("accessToken", accessToken);

export const setAccessToken = (token: string) => {
  accessToken = token;
};

export const getAccessToken = () => accessToken;

export const clearAccessToken = () => {
  accessToken = '';
};

export const setCurrentUser = (user: any) => {
  currentUser = user;
};

export const getCurrentUser = () => currentUser;

export const clearCurrentUser = () => {
  currentUser = null;
};