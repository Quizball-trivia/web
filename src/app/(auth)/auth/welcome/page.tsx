import { permanentRedirect } from "next/navigation";

export default function AuthWelcomePage() {
  permanentRedirect("/");
}
