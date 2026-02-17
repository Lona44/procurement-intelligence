import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// Mock next/link to render a plain anchor
vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    ...props
  }: {
    children: React.ReactNode;
    href: string;
    [key: string]: unknown;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

// Mock next/navigation
const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

// Mock framer-motion using our shared mock
vi.mock("framer-motion", async () => await import("./__mocks__/framer-motion"));

// Mock the API module
vi.mock("@/lib/api", () => ({
  startDemo: vi.fn(),
}));

import LandingPage from "@/app/page";
import { startDemo } from "@/lib/api";

describe("Landing page demo button", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders a "Try Demo" button', () => {
    render(<LandingPage />);
    expect(screen.getByRole("button", { name: /try demo/i })).toBeInTheDocument();
  });

  it("calls startDemo and navigates to arena on click", async () => {
    const user = userEvent.setup();
    vi.mocked(startDemo).mockResolvedValueOnce({ session_id: "demo-abc" });

    render(<LandingPage />);
    const btn = screen.getByRole("button", { name: /try demo/i });
    await user.click(btn);

    expect(startDemo).toHaveBeenCalledOnce();
    expect(mockPush).toHaveBeenCalledWith("/arena?session=demo-abc");
  });

  it("disables the button while loading", async () => {
    // Make startDemo hang indefinitely
    vi.mocked(startDemo).mockReturnValue(new Promise(() => {}));

    const user = userEvent.setup();
    render(<LandingPage />);
    const btn = screen.getByRole("button", { name: /try demo/i });
    await user.click(btn);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /loading/i })).toBeDisabled();
    });
  });
});
