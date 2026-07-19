let currentUser: any = null;

export const setCurrentUser = (user: any) => {
  currentUser = user;
};

export const getCurrentUser = () => currentUser;

export const clearCurrentUser = () => {
  currentUser = null;
};
