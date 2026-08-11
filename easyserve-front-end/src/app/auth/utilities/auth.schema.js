import z from "zod";

export const registerDefaultValues = {
  firstName: "",
  lastName: "",
  username: "",
  email: "",
  password: "",
  confirm_password: "",
};

export const loginDefaultValues = {
  email: "",
  password: "",
};

export const registerSchema = z
  .object({
    firstName: z
      .string()
      .trim()
      .min(3, {
        error: "First Name must be at least 3 characters.",
      })
      .max(50, { error: "First Name must be at most 50 characters long." }),
    lastName: z
      .string()
      .trim()
      .min(3, {
        error: "Last Name must be at least 3 characters.",
      })
      .max(50, { error: "Last Name must be at most 50 characters long." }),
    username: z
      .string()
      .trim()
      .min(3, {
        error: "Username must be at least 3 characters.",
      })
      .max(50, { error: "Username must be at most 50 characters long." }),
    email: z.email({ error: "Enter a valid email." }),
    password: z
      .string()
      .min(8, { error: "Password must be at least 8 characters." })
      .regex(/[A-Z]/, "Password must contain at least one uppercase letter.")
      .regex(/[a-z]/, "Password must contain at least one lowercase letter.")
      .regex(/[0-9]/, "Password must contain at least one number.")
      .regex(
        /[^a-zA-Z0-9]/,
        "Password must contain at least one special character."
      ),
    confirm_password: z
      .string()
      .min(1, { error: "Please confirm your password." }),
  })
  .refine((data) => data.password === data.confirm_password, {
    path: ["confirm_password"],
    error: "Passwords do not match.",
  });

export const loginSchema = z.object({
  email: z.email({ error: "Enter a valid email." }),
  password: z
    .string()
    .min(8, { error: "Password must be at least 8 characters." }),
});
