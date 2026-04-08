import * as authActions from "./auth";
import * as postActions from "./posts";

export const server = {
  ...authActions,
  ...postActions,
};
