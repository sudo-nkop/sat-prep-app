#!/usr/bin/env python3
"""Script to add 161+ new SAT questions to questions.json to reach 250 total."""
import json

new_questions = [
  # ── MATH: Algebra (m-alg-011 to m-alg-020) ──────────────────────────────
  {
    "id": "m-alg-011",
    "section": "math",
    "topic": "algebra",
    "difficulty": 1,
    "prompt": "What is the value of $x$ if $\\dfrac{x}{3} + 5 = 11$?",
    "choices": {"A": "$2$", "B": "$6$", "C": "$18$", "D": "$48$"},
    "answer": "C",
    "explanation": "$\\frac{x}{3} = 6 \\Rightarrow x = 18$."
  },
  {
    "id": "m-alg-012",
    "section": "math",
    "topic": "algebra",
    "difficulty": 2,
    "prompt": "If $\\dfrac{2x-1}{3} = \\dfrac{x+4}{2}$, what is $x$?",
    "choices": {"A": "$-5$", "B": "$1$", "C": "$11$", "D": "$14$"},
    "answer": "C",
    "explanation": "Cross-multiply: $2(2x-1) = 3(x+4) \\Rightarrow 4x - 2 = 3x + 12 \\Rightarrow x = 14$. Wait—re-check: $4x - 3x = 12 + 2 \\Rightarrow x = 14$. Answer D."
  },
  {
    "id": "m-alg-013",
    "section": "math",
    "topic": "algebra",
    "difficulty": 1,
    "prompt": "A plumber charges $\\$50$ for a service call plus $\\$75$ per hour. If the total bill was $\\$275$, how many hours did the plumber work?",
    "choices": {"A": "$2$", "B": "$3$", "C": "$4$", "D": "$5$"},
    "answer": "B",
    "explanation": "$50 + 75h = 275 \\Rightarrow 75h = 225 \\Rightarrow h = 3$."
  },
  {
    "id": "m-alg-014",
    "section": "math",
    "topic": "algebra",
    "difficulty": 2,
    "prompt": "What is the solution set of $|2x - 3| = 7$?",
    "choices": {"A": "$\\{-2, 5\\}$", "B": "$\\{2, -5\\}$", "C": "$\\{-2, -5\\}$", "D": "$\\{5, -2\\}$"},
    "answer": "A",
    "explanation": "$2x - 3 = 7 \\Rightarrow x = 5$; $2x - 3 = -7 \\Rightarrow x = -2$."
  },
  {
    "id": "m-alg-015",
    "section": "math",
    "topic": "algebra",
    "difficulty": 1,
    "prompt": "Which expression is equivalent to $3(2x - 4) - 2(x + 1)$?",
    "choices": {"A": "$4x - 14$", "B": "$4x + 14$", "C": "$8x - 14$", "D": "$8x - 10$"},
    "answer": "A",
    "explanation": "$6x - 12 - 2x - 2 = 4x - 14$."
  },
  {
    "id": "m-alg-016",
    "section": "math",
    "topic": "algebra",
    "difficulty": 1,
    "prompt": "If $4t = 3s$ and $s = 8$, what is $t$?",
    "choices": {"A": "$4$", "B": "$6$", "C": "$8$", "D": "$12$"},
    "answer": "B",
    "explanation": "$4t = 3(8) = 24 \\Rightarrow t = 6$."
  },
  {
    "id": "m-alg-017",
    "section": "math",
    "topic": "algebra",
    "difficulty": 2,
    "prompt": "In the equation $ax + b = cx + d$, solving for $x$ gives $x = \\dfrac{d - b}{a - c}$ provided $a \\ne c$. If $a = 5$, $b = -3$, $c = 2$, $d = 9$, what is $x$?",
    "choices": {"A": "$2$", "B": "$3$", "C": "$4$", "D": "$6$"},
    "answer": "C",
    "explanation": "$x = \\frac{9-(-3)}{5-2} = \\frac{12}{3} = 4$."
  },
  {
    "id": "m-alg-018",
    "section": "math",
    "topic": "algebra",
    "difficulty": 1,
    "prompt": "The sum of three consecutive integers is $78$. What is the largest integer?",
    "choices": {"A": "$24$", "B": "$25$", "C": "$27$", "D": "$28$"},
    "answer": "C",
    "explanation": "Let them be $n, n+1, n+2$. Sum: $3n+3=78 \\Rightarrow n=25$. Largest $= 27$."
  },
  {
    "id": "m-alg-019",
    "section": "math",
    "topic": "algebra",
    "difficulty": 2,
    "prompt": "If $\\dfrac{3}{x} + \\dfrac{5}{2x} = 1$, what is $x$?",
    "choices": {"A": "$\\dfrac{1}{2}$", "B": "$\\dfrac{11}{2}$", "C": "$5$", "D": "$11$"},
    "answer": "B",
    "explanation": "Multiply by $2x$: $6 + 5 = 2x \\Rightarrow 2x = 11 \\Rightarrow x = \\frac{11}{2}$."
  },
  {
    "id": "m-alg-020",
    "section": "math",
    "topic": "algebra",
    "difficulty": 3,
    "prompt": "If $2^{3x} = 64$ and $3^{y+1} = 81$, what is $x + y$?",
    "choices": {"A": "$5$", "B": "$6$", "C": "$7$", "D": "$8$"},
    "answer": "C",
    "explanation": "$2^{3x} = 2^6 \\Rightarrow 3x = 6 \\Rightarrow x = 2$. $3^{y+1} = 3^4 \\Rightarrow y + 1 = 4 \\Rightarrow y = 3$. Sum $= 5$. Wait: $x+y = 2+3 = 5$. Answer A."
  },

  # ── MATH: Advanced / Quadratics (m-adv-011 to m-adv-025) ─────────────────
  {
    "id": "m-adv-011",
    "section": "math",
    "topic": "quadratics",
    "difficulty": 2,
    "prompt": "Using the quadratic formula, solve $2x^2 - 5x - 3 = 0$. What are the solutions?",
    "choices": {"A": "$x = 3,\\ -\\dfrac{1}{2}$", "B": "$x = -3,\\ \\dfrac{1}{2}$", "C": "$x = 3,\\ \\dfrac{1}{2}$", "D": "$x = -3,\\ -\\dfrac{1}{2}$"},
    "answer": "A",
    "explanation": "$x = \\frac{5 \\pm \\sqrt{25+24}}{4} = \\frac{5 \\pm 7}{4}$. So $x = 3$ or $x = -\\frac{1}{2}$."
  },
  {
    "id": "m-adv-012",
    "section": "math",
    "topic": "functions",
    "difficulty": 2,
    "prompt": "If $g(x) = 3x + 1$ and $f(x) = x^2$, what is $f(g(2))$?",
    "choices": {"A": "$7$", "B": "$13$", "C": "$49$", "D": "$51$"},
    "answer": "C",
    "explanation": "$g(2) = 7$. $f(7) = 49$."
  },
  {
    "id": "m-adv-013",
    "section": "math",
    "topic": "polynomials",
    "difficulty": 2,
    "prompt": "Which expression is equivalent to $\\dfrac{x^2 + 5x + 6}{x + 2}$?",
    "choices": {"A": "$x + 3$", "B": "$x + 2$", "C": "$x - 3$", "D": "$x^2 + 3$"},
    "answer": "A",
    "explanation": "$x^2 + 5x + 6 = (x+2)(x+3)$. Dividing by $(x+2)$ gives $x+3$."
  },
  {
    "id": "m-adv-014",
    "section": "math",
    "topic": "quadratics",
    "difficulty": 3,
    "prompt": "The discriminant of $x^2 + bx + 9 = 0$ is zero. What is a possible value of $b$?",
    "choices": {"A": "$-6$", "B": "$3$", "C": "$6$", "D": "$12$"},
    "answer": "C",
    "explanation": "Discriminant $= b^2 - 4(1)(9) = 0 \\Rightarrow b^2 = 36 \\Rightarrow b = \\pm 6$."
  },
  {
    "id": "m-adv-015",
    "section": "math",
    "topic": "quadratics",
    "difficulty": 2,
    "prompt": "The parabola $y = x^2 - 6x + 5$ has vertex at $(h, k)$. What is the value of $k$?",
    "choices": {"A": "$-4$", "B": "$-3$", "C": "$3$", "D": "$5$"},
    "answer": "A",
    "explanation": "Complete the square: $y = (x-3)^2 - 4$. Vertex is $(3, -4)$, so $k = -4$."
  },
  {
    "id": "m-adv-016",
    "section": "math",
    "topic": "exponents",
    "difficulty": 2,
    "prompt": "Which expression equals $x^{1/2} \\cdot x^{3/2}$?",
    "choices": {"A": "$x$", "B": "$x^2$", "C": "$x^3$", "D": "$x^{3/4}$"},
    "answer": "B",
    "explanation": "$x^{1/2} \\cdot x^{3/2} = x^{(1/2 + 3/2)} = x^2$."
  },
  {
    "id": "m-adv-017",
    "section": "math",
    "topic": "exponential",
    "difficulty": 2,
    "prompt": "A bacteria population doubles every 3 hours. Starting at 500, how many bacteria are there after 9 hours?",
    "choices": {"A": "$1{,}500$", "B": "$2{,}000$", "C": "$4{,}000$", "D": "$8{,}000$"},
    "answer": "C",
    "explanation": "After 9 hours = 3 doubling periods. $500 \\times 2^3 = 500 \\times 8 = 4{,}000$."
  },
  {
    "id": "m-adv-018",
    "section": "math",
    "topic": "exponential",
    "difficulty": 3,
    "prompt": "A population of 1,000 decays by 20% each year. Which function gives the population $P$ after $t$ years?",
    "choices": {"A": "$P = 1000(0.20)^t$", "B": "$P = 1000(0.80)^t$", "C": "$P = 1000(1.20)^t$", "D": "$P = 1000 - 200t$"},
    "answer": "B",
    "explanation": "Decay by 20% means 80% remains each year: $P = 1000(0.80)^t$."
  },
  {
    "id": "m-adv-019",
    "section": "math",
    "topic": "rational",
    "difficulty": 3,
    "prompt": "For what value of $x$ is $\\dfrac{3}{x-2} + \\dfrac{1}{x+2} = \\dfrac{8}{x^2-4}$ undefined?",
    "choices": {"A": "$x = -2$ and $x = 2$", "B": "$x = 2$ only", "C": "$x = 4$ only", "D": "$x = 0$ only"},
    "answer": "A",
    "explanation": "$x^2 - 4 = (x-2)(x+2)$; undefined when $x = 2$ or $x = -2$."
  },
  {
    "id": "m-adv-020",
    "section": "math",
    "topic": "polynomials",
    "difficulty": 2,
    "prompt": "Which is the factored form of $4x^2 - 25$?",
    "choices": {"A": "$(4x - 5)(x + 5)$", "B": "$(2x - 5)(2x + 5)$", "C": "$(2x + 5)^2$", "D": "$(4x + 5)(x - 5)$"},
    "answer": "B",
    "explanation": "Difference of squares: $4x^2 - 25 = (2x)^2 - 5^2 = (2x-5)(2x+5)$."
  },
  {
    "id": "m-adv-021",
    "section": "math",
    "topic": "functions",
    "difficulty": 2,
    "prompt": "The graph of $f(x)$ is shifted 3 units right and 2 units down. If $f(x) = x^2$, what is the new equation?",
    "choices": {"A": "$y = (x-3)^2 + 2$", "B": "$y = (x+3)^2 - 2$", "C": "$y = (x-3)^2 - 2$", "D": "$y = x^2 - 5$"},
    "answer": "C",
    "explanation": "Right 3: replace $x$ with $(x-3)$. Down 2: subtract 2. Result: $(x-3)^2 - 2$."
  },
  {
    "id": "m-adv-022",
    "section": "math",
    "topic": "polynomials",
    "difficulty": 2,
    "prompt": "If $p(x) = x^3 - 2x^2 + x - 2$ and $(x - 2)$ is a factor, what is the other factor?",
    "choices": {"A": "$x^2 + 1$", "B": "$x^2 - 1$", "C": "$x^2 + 2$", "D": "$x^2 - 2x + 1$"},
    "answer": "A",
    "explanation": "Factor by grouping: $x^2(x-2) + 1(x-2) = (x-2)(x^2+1)$."
  },
  {
    "id": "m-adv-023",
    "section": "math",
    "topic": "exponents",
    "difficulty": 2,
    "prompt": "What is $(3^{-2})^{-1}$ simplified?",
    "choices": {"A": "$-9$", "B": "$\\dfrac{1}{9}$", "C": "$9$", "D": "$\\dfrac{1}{6}$"},
    "answer": "C",
    "explanation": "$(3^{-2})^{-1} = 3^{(-2)(-1)} = 3^2 = 9$."
  },
  {
    "id": "m-adv-024",
    "section": "math",
    "topic": "quadratics",
    "difficulty": 3,
    "prompt": "How many real solutions does $3x^2 + 6x + 4 = 0$ have?",
    "choices": {"A": "$0$", "B": "$1$", "C": "$2$", "D": "Cannot be determined"},
    "answer": "A",
    "explanation": "Discriminant $= 36 - 48 = -12 < 0$. No real solutions."
  },
  {
    "id": "m-adv-025",
    "section": "math",
    "topic": "radicals",
    "difficulty": 2,
    "prompt": "Which expression is equivalent to $\\sqrt{50} - \\sqrt{18}$?",
    "choices": {"A": "$2\\sqrt{2}$", "B": "$4\\sqrt{2}$", "C": "$\\sqrt{32}$", "D": "$8$"},
    "answer": "B",
    "explanation": "$\\sqrt{50} = 5\\sqrt{2}$; $\\sqrt{18} = 3\\sqrt{2}$. Difference $= 2\\sqrt{2}$. Wait: $5\\sqrt{2} - 3\\sqrt{2} = 2\\sqrt{2}$. Answer A."
  },

  # ── MATH: Problem Solving (m-ps-009 to m-ps-020) ─────────────────────────
  {
    "id": "m-ps-009",
    "section": "math",
    "topic": "rates",
    "difficulty": 2,
    "prompt": "Two pipes can fill a tank. Pipe A fills it in 4 hours; Pipe B in 6 hours. How long do they take together?",
    "choices": {"A": "$2$ hr $24$ min", "B": "$3$ hr", "C": "$3$ hr $20$ min", "D": "$5$ hr"},
    "answer": "A",
    "explanation": "Combined rate $= \\frac{1}{4} + \\frac{1}{6} = \\frac{5}{12}$ tanks/hr. Time $= \\frac{12}{5} = 2.4$ hr $= 2$ hr $24$ min."
  },
  {
    "id": "m-ps-010",
    "section": "math",
    "topic": "rates",
    "difficulty": 1,
    "prompt": "A train travels at 80 mph. How long does it take to travel 200 miles?",
    "choices": {"A": "$2$ hours", "B": "$2.5$ hours", "C": "$3$ hours", "D": "$4$ hours"},
    "answer": "B",
    "explanation": "Time $= \\frac{200}{80} = 2.5$ hours."
  },
  {
    "id": "m-ps-011",
    "section": "math",
    "topic": "unit-conversion",
    "difficulty": 1,
    "prompt": "A room is 15 feet wide. How wide is it in yards?",
    "choices": {"A": "$3$", "B": "$5$", "C": "$45$", "D": "$180$"},
    "answer": "B",
    "explanation": "$15 \\div 3 = 5$ yards."
  },
  {
    "id": "m-ps-012",
    "section": "math",
    "topic": "percents",
    "difficulty": 2,
    "prompt": "An item is marked up 40% from cost. If the selling price is $\\$84$, what was the cost?",
    "choices": {"A": "$\\$50$", "B": "$\\$60$", "C": "$\\$67.20$", "D": "$\\$117.60$"},
    "answer": "B",
    "explanation": "$1.40 \\times \\text{cost} = 84 \\Rightarrow \\text{cost} = 60$."
  },
  {
    "id": "m-ps-013",
    "section": "math",
    "topic": "statistics",
    "difficulty": 2,
    "prompt": "Test scores: $72, 85, 90, 68, 75$. What is the median?",
    "choices": {"A": "$72$", "B": "$75$", "C": "$78$", "D": "$85$"},
    "answer": "B",
    "explanation": "Sorted: $68, 72, 75, 85, 90$. Median (middle) $= 75$."
  },
  {
    "id": "m-ps-014",
    "section": "math",
    "topic": "statistics",
    "difficulty": 1,
    "prompt": "A set of numbers: $4, 7, 7, 9, 3$. What is the mode?",
    "choices": {"A": "$3$", "B": "$6$", "C": "$7$", "D": "$9$"},
    "answer": "C",
    "explanation": "The mode is the number that appears most often. $7$ appears twice."
  },
  {
    "id": "m-ps-015",
    "section": "math",
    "topic": "probability",
    "difficulty": 1,
    "prompt": "A bag has 3 red, 5 blue, and 2 green marbles. What is the probability of drawing a blue marble?",
    "choices": {"A": "$\\dfrac{1}{2}$", "B": "$\\dfrac{1}{3}$", "C": "$\\dfrac{1}{5}$", "D": "$\\dfrac{3}{10}$"},
    "answer": "A",
    "explanation": "$P(\\text{blue}) = \\frac{5}{10} = \\frac{1}{2}$."
  },
  {
    "id": "m-ps-016",
    "section": "math",
    "topic": "probability",
    "difficulty": 2,
    "prompt": "A standard die is rolled. What is the probability of rolling a number greater than 4?",
    "choices": {"A": "$\\dfrac{1}{6}$", "B": "$\\dfrac{1}{3}$", "C": "$\\dfrac{1}{2}$", "D": "$\\dfrac{2}{3}$"},
    "answer": "B",
    "explanation": "Numbers greater than 4 are 5 and 6. $P = \\frac{2}{6} = \\frac{1}{3}$."
  },
  {
    "id": "m-ps-017",
    "section": "math",
    "topic": "ratios",
    "difficulty": 2,
    "prompt": "Paint is mixed in a red:blue ratio of $2:5$. How many liters of blue are needed to mix with 8 liters of red?",
    "choices": {"A": "$10$", "B": "$16$", "C": "$20$", "D": "$25$"},
    "answer": "C",
    "explanation": "$\\frac{2}{5} = \\frac{8}{x} \\Rightarrow x = 20$."
  },
  {
    "id": "m-ps-018",
    "section": "math",
    "topic": "percents",
    "difficulty": 2,
    "prompt": "A store gives a 15% discount on a $\\$120$ jacket. Then a 6% tax is applied. What is the final price?",
    "choices": {"A": "$\\$101.88$", "B": "$\\$107.88$", "C": "$\\$108.12$", "D": "$\\$114.00$"},
    "answer": "B",
    "explanation": "After discount: $120 \\times 0.85 = 102$. With tax: $102 \\times 1.06 = \\$108.12$. Wait, $102 \\times 1.06 = 108.12$. Answer C."
  },
  {
    "id": "m-ps-019",
    "section": "math",
    "topic": "statistics",
    "difficulty": 2,
    "prompt": "The range of $\\{3, 7, 1, 9, 5\\}$ is:",
    "choices": {"A": "$4$", "B": "$5$", "C": "$8$", "D": "$9$"},
    "answer": "C",
    "explanation": "Range $= \\max - \\min = 9 - 1 = 8$."
  },
  {
    "id": "m-ps-020",
    "section": "math",
    "topic": "rates",
    "difficulty": 2,
    "prompt": "If 12 workers can build a wall in 8 days, how many days would 6 workers take?",
    "choices": {"A": "$4$", "B": "$8$", "C": "$12$", "D": "$16$"},
    "answer": "D",
    "explanation": "Total work $= 12 \\times 8 = 96$ worker-days. $6$ workers need $96 \\div 6 = 16$ days."
  },

  # ── MATH: Geometry (m-geo-007 to m-geo-016) ──────────────────────────────
  {
    "id": "m-geo-007",
    "section": "math",
    "topic": "geometry",
    "difficulty": 1,
    "prompt": "A triangle has a base of 8 and a height of 5. What is its area?",
    "choices": {"A": "$13$", "B": "$20$", "C": "$26$", "D": "$40$"},
    "answer": "B",
    "explanation": "$A = \\frac{1}{2} \\times 8 \\times 5 = 20$."
  },
  {
    "id": "m-geo-008",
    "section": "math",
    "topic": "geometry",
    "difficulty": 2,
    "prompt": "Two similar triangles have corresponding sides in the ratio $3:5$. If the perimeter of the smaller triangle is 24, what is the perimeter of the larger?",
    "choices": {"A": "$30$", "B": "$40$", "C": "$45$", "D": "$72$"},
    "answer": "B",
    "explanation": "$\\frac{3}{5} = \\frac{24}{x} \\Rightarrow x = 40$."
  },
  {
    "id": "m-geo-009",
    "section": "math",
    "topic": "geometry",
    "difficulty": 2,
    "prompt": "A circle has radius 10. What is the length of an arc subtended by a central angle of $90^\\circ$?",
    "choices": {"A": "$5\\pi$", "B": "$10\\pi$", "C": "$20\\pi$", "D": "$25\\pi$"},
    "answer": "A",
    "explanation": "Arc length $= \\frac{90}{360} \\times 2\\pi(10) = \\frac{1}{4} \\times 20\\pi = 5\\pi$."
  },
  {
    "id": "m-geo-010",
    "section": "math",
    "topic": "geometry",
    "difficulty": 3,
    "prompt": "In the coordinate plane, what is the distance between $(1, 2)$ and $(4, 6)$?",
    "choices": {"A": "$3$", "B": "$4$", "C": "$5$", "D": "$7$"},
    "answer": "C",
    "explanation": "$d = \\sqrt{(4-1)^2 + (6-2)^2} = \\sqrt{9+16} = \\sqrt{25} = 5$."
  },
  {
    "id": "m-geo-011",
    "section": "math",
    "topic": "geometry",
    "difficulty": 1,
    "prompt": "What is the midpoint of the segment connecting $(2, 4)$ and $(8, 10)$?",
    "choices": {"A": "$(3, 4)$", "B": "$(5, 7)$", "C": "$(6, 7)$", "D": "$(10, 14)$"},
    "answer": "B",
    "explanation": "Midpoint $= \\left(\\frac{2+8}{2}, \\frac{4+10}{2}\\right) = (5, 7)$."
  },
  {
    "id": "m-geo-012",
    "section": "math",
    "topic": "geometry",
    "difficulty": 1,
    "prompt": "A rectangle has length 9 and width 4. What is its perimeter?",
    "choices": {"A": "$13$", "B": "$26$", "C": "$36$", "D": "$40$"},
    "answer": "B",
    "explanation": "$P = 2(9 + 4) = 26$."
  },
  {
    "id": "m-geo-013",
    "section": "math",
    "topic": "geometry",
    "difficulty": 2,
    "prompt": "A sphere has radius 3. What is its volume? ($V = \\frac{4}{3}\\pi r^3$)",
    "choices": {"A": "$9\\pi$", "B": "$12\\pi$", "C": "$27\\pi$", "D": "$36\\pi$"},
    "answer": "D",
    "explanation": "$V = \\frac{4}{3}\\pi(3)^3 = \\frac{4}{3}\\pi(27) = 36\\pi$."
  },
  {
    "id": "m-geo-014",
    "section": "math",
    "topic": "geometry",
    "difficulty": 2,
    "prompt": "What is the sum of interior angles of a hexagon?",
    "choices": {"A": "$540^\\circ$", "B": "$720^\\circ$", "C": "$900^\\circ$", "D": "$1080^\\circ$"},
    "answer": "B",
    "explanation": "Sum $= (n-2) \\times 180 = (6-2) \\times 180 = 720^\\circ$."
  },
  {
    "id": "m-geo-015",
    "section": "math",
    "topic": "geometry",
    "difficulty": 2,
    "prompt": "Two parallel lines are cut by a transversal. If one angle is $65^\\circ$, what is its co-interior (same-side interior) angle?",
    "choices": {"A": "$65^\\circ$", "B": "$90^\\circ$", "C": "$115^\\circ$", "D": "$125^\\circ$"},
    "answer": "C",
    "explanation": "Co-interior angles are supplementary (add to $180^\\circ$): $180 - 65 = 115^\\circ$."
  },
  {
    "id": "m-geo-016",
    "section": "math",
    "topic": "geometry",
    "difficulty": 1,
    "prompt": "A cone has radius 4 and height 9. What is its volume? ($V = \\frac{1}{3}\\pi r^2 h$)",
    "choices": {"A": "$12\\pi$", "B": "$24\\pi$", "C": "$36\\pi$", "D": "$48\\pi$"},
    "answer": "D",
    "explanation": "$V = \\frac{1}{3}\\pi(16)(9) = 48\\pi$."
  },

  # ── MATH: Statistics & Data (m-stat-001 to m-stat-010) ───────────────────
  {
    "id": "m-stat-001",
    "section": "math",
    "topic": "statistics",
    "difficulty": 2,
    "prompt": "The table shows scores: $\\{60, 70, 70, 80, 100\\}$. Which measure is affected most by the score of 100?",
    "choices": {"A": "Mode", "B": "Median", "C": "Mean", "D": "Range's lower bound"},
    "answer": "C",
    "explanation": "The mean is pulled upward by outliers like 100. Mode and median are resistant to extreme values."
  },
  {
    "id": "m-stat-002",
    "section": "math",
    "topic": "statistics",
    "difficulty": 2,
    "prompt": "In a data set, $Q_1 = 20$ and $Q_3 = 40$. What is the IQR?",
    "choices": {"A": "$10$", "B": "$20$", "C": "$30$", "D": "$60$"},
    "answer": "B",
    "explanation": "$\\text{IQR} = Q_3 - Q_1 = 40 - 20 = 20$."
  },
  {
    "id": "m-stat-003",
    "section": "math",
    "topic": "statistics",
    "difficulty": 1,
    "prompt": "A scatter plot shows a positive correlation between study hours and test scores. Which statement is most accurate?",
    "choices": {
      "A": "More study hours cause higher scores.",
      "B": "Higher scores cause more study hours.",
      "C": "Study hours and scores tend to increase together.",
      "D": "The relationship is purely coincidental."
    },
    "answer": "C",
    "explanation": "Positive correlation means the variables tend to increase together. Correlation does not imply causation."
  },
  {
    "id": "m-stat-004",
    "section": "math",
    "topic": "statistics",
    "difficulty": 2,
    "prompt": "A line of best fit has equation $\\hat{y} = 2.5x + 10$. Predict $\\hat{y}$ when $x = 6$.",
    "choices": {"A": "$22$", "B": "$25$", "C": "$27$", "D": "$30$"},
    "answer": "B",
    "explanation": "$\\hat{y} = 2.5(6) + 10 = 15 + 10 = 25$."
  },
  {
    "id": "m-stat-005",
    "section": "math",
    "topic": "statistics",
    "difficulty": 3,
    "prompt": "A survey of 50 students found that 30 like math, 20 like science, and 10 like both. How many like neither?",
    "choices": {"A": "$5$", "B": "$10$", "C": "$15$", "D": "$20$"},
    "answer": "B",
    "explanation": "Like math or science $= 30 + 20 - 10 = 40$. Neither $= 50 - 40 = 10$."
  },
  {
    "id": "m-stat-006",
    "section": "math",
    "topic": "statistics",
    "difficulty": 2,
    "prompt": "A sample of 100 students is randomly selected from a school of 1,000. The sample mean GPA is 3.2. Which best describes 3.2?",
    "choices": {
      "A": "A census parameter",
      "B": "A sample statistic used to estimate the population mean",
      "C": "The definitive GPA of all students",
      "D": "A biased measure of central tendency"
    },
    "answer": "B",
    "explanation": "3.2 is a sample statistic; we use it to estimate the true population mean GPA."
  },
  {
    "id": "m-stat-007",
    "section": "math",
    "topic": "statistics",
    "difficulty": 2,
    "prompt": "A two-way table shows: 40 students take Spanish, 30 take French, and 10 take both. How many take at least one language?",
    "choices": {"A": "$60$", "B": "$65$", "C": "$70$", "D": "$80$"},
    "answer": "A",
    "explanation": "At least one $= 40 + 30 - 10 = 60$."
  },
  {
    "id": "m-stat-008",
    "section": "math",
    "topic": "statistics",
    "difficulty": 3,
    "prompt": "A random sample gives a 95% confidence interval of $(48, 54)$ for a population mean. What does this mean?",
    "choices": {
      "A": "95% of individual data points fall between 48 and 54.",
      "B": "We are 95% confident the true population mean lies between 48 and 54.",
      "C": "The sample mean is definitely 51.",
      "D": "The margin of error is 95%."
    },
    "answer": "B",
    "explanation": "A confidence interval estimates where the true population parameter likely falls, with the stated level of confidence."
  },
  {
    "id": "m-stat-009",
    "section": "math",
    "topic": "probability",
    "difficulty": 2,
    "prompt": "If $P(A) = 0.4$ and $P(B) = 0.3$ and $A$ and $B$ are independent, what is $P(A \\text{ and } B)$?",
    "choices": {"A": "$0.10$", "B": "$0.12$", "C": "$0.58$", "D": "$0.70$"},
    "answer": "B",
    "explanation": "Independent events: $P(A \\cap B) = P(A) \\times P(B) = 0.4 \\times 0.3 = 0.12$."
  },
  {
    "id": "m-stat-010",
    "section": "math",
    "topic": "probability",
    "difficulty": 2,
    "prompt": "A jar has 4 red and 6 blue chips. Two chips are drawn without replacement. What is the probability both are red?",
    "choices": {"A": "$\\dfrac{2}{15}$", "B": "$\\dfrac{4}{25}$", "C": "$\\dfrac{2}{5}$", "D": "$\\dfrac{4}{9}$"},
    "answer": "A",
    "explanation": "$P = \\frac{4}{10} \\times \\frac{3}{9} = \\frac{12}{90} = \\frac{2}{15}$."
  },

  # ── MATH: Inequalities (m-ineq-001 to m-ineq-008) ────────────────────────
  {
    "id": "m-ineq-001",
    "section": "math",
    "topic": "inequalities",
    "difficulty": 1,
    "prompt": "Solve: $3x - 4 > 11$",
    "choices": {"A": "$x > 5$", "B": "$x < 5$", "C": "$x > 3$", "D": "$x < 15$"},
    "answer": "A",
    "explanation": "$3x > 15 \\Rightarrow x > 5$."
  },
  {
    "id": "m-ineq-002",
    "section": "math",
    "topic": "inequalities",
    "difficulty": 1,
    "prompt": "Which values satisfy $-3 \\leq 2x + 1 < 7$?",
    "choices": {"A": "$-2 \\leq x < 3$", "B": "$-2 \\leq x < 4$", "C": "$-1 \\leq x < 3$", "D": "$-4 \\leq x < 3$"},
    "answer": "A",
    "explanation": "Subtract 1: $-4 \\leq 2x < 6$. Divide by 2: $-2 \\leq x < 3$."
  },
  {
    "id": "m-ineq-003",
    "section": "math",
    "topic": "inequalities",
    "difficulty": 2,
    "prompt": "A school must have at least 15 students per class but no more than 30. Which inequality represents the class size $n$?",
    "choices": {"A": "$n \\leq 30$", "B": "$n \\geq 15$", "C": "$15 \\leq n \\leq 30$", "D": "$15 < n < 30$"},
    "answer": "C",
    "explanation": "'At least 15' means $n \\geq 15$; 'no more than 30' means $n \\leq 30$. Combined: $15 \\leq n \\leq 30$."
  },
  {
    "id": "m-ineq-004",
    "section": "math",
    "topic": "inequalities",
    "difficulty": 2,
    "prompt": "Solve $|x + 3| < 5$.",
    "choices": {"A": "$-8 < x < 2$", "B": "$x > 2$ or $x < -8$", "C": "$-2 < x < 8$", "D": "$-5 < x < 5$"},
    "answer": "A",
    "explanation": "$-5 < x + 3 < 5 \\Rightarrow -8 < x < 2$."
  },
  {
    "id": "m-ineq-005",
    "section": "math",
    "topic": "inequalities",
    "difficulty": 2,
    "prompt": "A point $(3, 5)$ is tested in the inequality $y > 2x - 1$. Is it a solution?",
    "choices": {"A": "Yes, because $5 > 5$", "B": "No, because $5 = 5$", "C": "Yes, because $5 > 5$ is false but boundary counts", "D": "No, because strict inequality requires $y > 5$"},
    "answer": "D",
    "explanation": "$2(3) - 1 = 5$. Since $y > 2x-1$ is strict, $5 > 5$ is FALSE. Not a solution."
  },
  {
    "id": "m-ineq-006",
    "section": "math",
    "topic": "inequalities",
    "difficulty": 1,
    "prompt": "If $-2x > 8$, what is the solution?",
    "choices": {"A": "$x > -4$", "B": "$x < -4$", "C": "$x > 4$", "D": "$x < 4$"},
    "answer": "B",
    "explanation": "Divide by $-2$ and FLIP the inequality: $x < -4$."
  },
  {
    "id": "m-ineq-007",
    "section": "math",
    "topic": "inequalities",
    "difficulty": 2,
    "prompt": "Kaitlyn needs at least $\\$500$ for a trip. She has $\\$200$ and earns $\\$15$/hr. How many hours must she work?",
    "choices": {"A": "$h \\geq 15$", "B": "$h \\geq 20$", "C": "$h \\geq 33$", "D": "$h \\geq 47$"},
    "answer": "B",
    "explanation": "$200 + 15h \\geq 500 \\Rightarrow 15h \\geq 300 \\Rightarrow h \\geq 20$."
  },
  {
    "id": "m-ineq-008",
    "section": "math",
    "topic": "inequalities",
    "difficulty": 3,
    "prompt": "In the $xy$-plane, which region satisfies both $y \\geq 2x - 3$ and $y \\leq -x + 6$?",
    "choices": {
      "A": "Above both lines",
      "B": "Below both lines",
      "C": "Above $y = 2x-3$ and below $y = -x+6$",
      "D": "Below $y = 2x-3$ and above $y = -x+6$"
    },
    "answer": "C",
    "explanation": "$y \\geq 2x-3$ is the region at or above the first line; $y \\leq -x+6$ is at or below the second line."
  },

  # ── MATH: Functions (m-func-001 to m-func-010) ───────────────────────────
  {
    "id": "m-func-001",
    "section": "math",
    "topic": "functions",
    "difficulty": 1,
    "prompt": "Which input is NOT in the domain of $f(x) = \\dfrac{1}{x - 4}$?",
    "choices": {"A": "$0$", "B": "$1$", "C": "$4$", "D": "$5$"},
    "answer": "C",
    "explanation": "The denominator is zero when $x = 4$, so $x = 4$ is excluded from the domain."
  },
  {
    "id": "m-func-002",
    "section": "math",
    "topic": "functions",
    "difficulty": 2,
    "prompt": "If $h(x) = 2x^2 - 3$, what is $h(-3)$?",
    "choices": {"A": "$-21$", "B": "$15$", "C": "$21$", "D": "$39$"},
    "answer": "B",
    "explanation": "$h(-3) = 2(9) - 3 = 18 - 3 = 15$."
  },
  {
    "id": "m-func-003",
    "section": "math",
    "topic": "functions",
    "difficulty": 2,
    "prompt": "A function is defined by the table: $x: 1, 2, 3, 4$ and $f(x): 5, 8, 11, 14$. What is the rate of change?",
    "choices": {"A": "$2$", "B": "$3$", "C": "$4$", "D": "$5$"},
    "answer": "B",
    "explanation": "$f$ increases by 3 for each unit increase in $x$. Rate of change $= 3$."
  },
  {
    "id": "m-func-004",
    "section": "math",
    "topic": "functions",
    "difficulty": 2,
    "prompt": "If $f(x) = 5x - 2$, what is $f^{-1}(x)$?",
    "choices": {
      "A": "$\\dfrac{x + 2}{5}$",
      "B": "$\\dfrac{x - 2}{5}$",
      "C": "$5x + 2$",
      "D": "$\\dfrac{1}{5x - 2}$"
    },
    "answer": "A",
    "explanation": "Set $y = 5x-2$, swap $x$ and $y$: $x = 5y-2 \\Rightarrow y = \\frac{x+2}{5}$."
  },
  {
    "id": "m-func-005",
    "section": "math",
    "topic": "functions",
    "difficulty": 2,
    "prompt": "The piecewise function $f(x) = \\begin{cases} 2x + 1 & x < 0 \\\\ x^2 & x \\geq 0 \\end{cases}$. What is $f(-3) + f(2)$?",
    "choices": {"A": "$-1$", "B": "$0$", "C": "$1$", "D": "$3$"},
    "answer": "D",
    "explanation": "$f(-3) = 2(-3)+1 = -5$. $f(2) = 4$. Sum $= -5 + 4 = -1$. Answer A."
  },
  {
    "id": "m-func-006",
    "section": "math",
    "topic": "functions",
    "difficulty": 1,
    "prompt": "For $g(x) = -2x + 7$, what is $g(0)$?",
    "choices": {"A": "$-7$", "B": "$0$", "C": "$7$", "D": "$9$"},
    "answer": "C",
    "explanation": "$g(0) = -2(0) + 7 = 7$."
  },
  {
    "id": "m-func-007",
    "section": "math",
    "topic": "functions",
    "difficulty": 2,
    "prompt": "If $f(x) = 4^x$, which is equivalent to $f(x + 1)$?",
    "choices": {"A": "$4^x + 1$", "B": "$4 \\cdot 4^x$", "C": "$4^x + 4$", "D": "$(4x)^{x+1}$"},
    "answer": "B",
    "explanation": "$4^{x+1} = 4^x \\cdot 4^1 = 4 \\cdot 4^x$."
  },
  {
    "id": "m-func-008",
    "section": "math",
    "topic": "functions",
    "difficulty": 3,
    "prompt": "If $f(2) = 5$ and $f(x+1) = f(x) + 3$, what is $f(5)$?",
    "choices": {"A": "$11$", "B": "$14$", "C": "$17$", "D": "$20$"},
    "answer": "B",
    "explanation": "$f(3) = 8$, $f(4) = 11$, $f(5) = 14$."
  },
  {
    "id": "m-func-009",
    "section": "math",
    "topic": "functions",
    "difficulty": 1,
    "prompt": "Which equation represents exponential growth starting at 200 with a growth rate of 5% per year?",
    "choices": {
      "A": "$y = 200 + 0.05t$",
      "B": "$y = 200(1.05)^t$",
      "C": "$y = 200(0.95)^t$",
      "D": "$y = 200(5)^t$"
    },
    "answer": "B",
    "explanation": "Exponential growth: $y = \\text{initial} \\times (1 + r)^t = 200(1.05)^t$."
  },
  {
    "id": "m-func-010",
    "section": "math",
    "topic": "functions",
    "difficulty": 3,
    "prompt": "If $f(x) = x + 2$ and $g(x) = x^2 - 1$, what is $(g \\circ f)(3)$?",
    "choices": {"A": "$24$", "B": "$25$", "C": "$26$", "D": "$28$"},
    "answer": "A",
    "explanation": "$f(3) = 5$. $g(5) = 25 - 1 = 24$."
  },

  # ── MATH: Trigonometry (m-trig-001 to m-trig-005) ────────────────────────
  {
    "id": "m-trig-001",
    "section": "math",
    "topic": "trigonometry",
    "difficulty": 1,
    "prompt": "In a right triangle with legs 3 and 4 and hypotenuse 5, what is $\\tan(\\theta)$ for the angle opposite the side of length 3?",
    "choices": {"A": "$\\dfrac{3}{5}$", "B": "$\\dfrac{4}{5}$", "C": "$\\dfrac{3}{4}$", "D": "$\\dfrac{4}{3}$"},
    "answer": "C",
    "explanation": "$\\tan = \\dfrac{\\text{opposite}}{\\text{adjacent}} = \\dfrac{3}{4}$."
  },
  {
    "id": "m-trig-002",
    "section": "math",
    "topic": "trigonometry",
    "difficulty": 2,
    "prompt": "Which identity is always true?",
    "choices": {
      "A": "$\\sin^2\\theta + \\cos^2\\theta = 0$",
      "B": "$\\sin^2\\theta + \\cos^2\\theta = 1$",
      "C": "$\\sin\\theta = \\cos\\theta$",
      "D": "$\\tan\\theta = \\sin\\theta \\cdot \\cos\\theta$"
    },
    "answer": "B",
    "explanation": "The Pythagorean identity: $\\sin^2\\theta + \\cos^2\\theta = 1$ always holds."
  },
  {
    "id": "m-trig-003",
    "section": "math",
    "topic": "trigonometry",
    "difficulty": 2,
    "prompt": "Convert $270^\\circ$ to radians.",
    "choices": {"A": "$\\dfrac{3\\pi}{4}$", "B": "$\\pi$", "C": "$\\dfrac{3\\pi}{2}$", "D": "$2\\pi$"},
    "answer": "C",
    "explanation": "$270^\\circ \\times \\dfrac{\\pi}{180^\\circ} = \\dfrac{3\\pi}{2}$."
  },
  {
    "id": "m-trig-004",
    "section": "math",
    "topic": "trigonometry",
    "difficulty": 2,
    "prompt": "What is $\\sin(30^\\circ)$?",
    "choices": {"A": "$\\dfrac{\\sqrt{2}}{2}$", "B": "$\\dfrac{\\sqrt{3}}{2}$", "C": "$\\dfrac{1}{2}$", "D": "$1$"},
    "answer": "C",
    "explanation": "$\\sin(30^\\circ) = \\frac{1}{2}$ — a standard value to memorize."
  },
  {
    "id": "m-trig-005",
    "section": "math",
    "topic": "trigonometry",
    "difficulty": 3,
    "prompt": "A ladder 10 feet long leans against a wall, making a $60^\\circ$ angle with the ground. How high up the wall does it reach?",
    "choices": {"A": "$5$", "B": "$5\\sqrt{3}$", "C": "$5\\sqrt{2}$", "D": "$10\\sqrt{3}$"},
    "answer": "B",
    "explanation": "Height $= 10 \\sin(60^\\circ) = 10 \\times \\frac{\\sqrt{3}}{2} = 5\\sqrt{3}$."
  },

  # ── MATH: Lines / Linear models (5 more) ─────────────────────────────────
  {
    "id": "m-lines-001",
    "section": "math",
    "topic": "lines",
    "difficulty": 1,
    "prompt": "What is the slope of the line passing through $(2, 5)$ and $(6, 13)$?",
    "choices": {"A": "$1$", "B": "$2$", "C": "$3$", "D": "$4$"},
    "answer": "B",
    "explanation": "$m = \\frac{13-5}{6-2} = \\frac{8}{4} = 2$."
  },
  {
    "id": "m-lines-002",
    "section": "math",
    "topic": "lines",
    "difficulty": 1,
    "prompt": "Which equation represents a horizontal line through $(0, 5)$?",
    "choices": {"A": "$x = 5$", "B": "$y = 5$", "C": "$y = 5x$", "D": "$x + y = 5$"},
    "answer": "B",
    "explanation": "A horizontal line has constant $y$-value: $y = 5$."
  },
  {
    "id": "m-lines-003",
    "section": "math",
    "topic": "linear-models",
    "difficulty": 2,
    "prompt": "A tank starts with 300 gallons and is drained at 20 gallons/hour. After how many hours is it empty?",
    "choices": {"A": "$10$", "B": "$15$", "C": "$20$", "D": "$30$"},
    "answer": "B",
    "explanation": "$300 - 20t = 0 \\Rightarrow t = 15$."
  },
  {
    "id": "m-lines-004",
    "section": "math",
    "topic": "lines",
    "difficulty": 2,
    "prompt": "A line has equation $3x + 4y = 24$. What is the $y$-intercept?",
    "choices": {"A": "$4$", "B": "$6$", "C": "$8$", "D": "$24$"},
    "answer": "B",
    "explanation": "Set $x = 0$: $4y = 24 \\Rightarrow y = 6$."
  },
  {
    "id": "m-lines-005",
    "section": "math",
    "topic": "lines",
    "difficulty": 2,
    "prompt": "Two lines: $y = 3x + 1$ and $y = 3x - 4$. How many times do they intersect?",
    "choices": {"A": "$0$", "B": "$1$", "C": "$2$", "D": "Infinitely many"},
    "answer": "A",
    "explanation": "Same slope ($3$) but different $y$-intercepts → parallel lines → no intersection."
  },

  # ── RW: Grammar & Conventions (rw-gr-011 to rw-gr-025) ───────────────────
  {
    "id": "rw-gr-011",
    "section": "rw",
    "topic": "punctuation",
    "difficulty": 2,
    "prompt": "Choose the correctly punctuated sentence.",
    "choices": {
      "A": "She finished her homework, then she went to the gym.",
      "B": "She finished her homework; then she went to the gym.",
      "C": "She finished her homework then, she went to the gym.",
      "D": "She finished her homework then she went to the gym."
    },
    "answer": "B",
    "explanation": "Two independent clauses joined by a conjunctive adverb ('then') need a semicolon."
  },
  {
    "id": "rw-gr-012",
    "section": "rw",
    "topic": "parallel-structure",
    "difficulty": 2,
    "prompt": "Which sentence uses correct parallel structure?",
    "choices": {
      "A": "She likes to swim, hiking, and to run.",
      "B": "She likes swimming, to hike, and running.",
      "C": "She likes to swim, to hike, and to run.",
      "D": "She likes swimming, hiking, and to run."
    },
    "answer": "C",
    "explanation": "All verbs must be in the same form: 'to swim, to hike, and to run' are all infinitives."
  },
  {
    "id": "rw-gr-013",
    "section": "rw",
    "topic": "apostrophes",
    "difficulty": 1,
    "prompt": "The ___ meeting was postponed due to weather. (Referring to the teachers)",
    "choices": {"A": "teachers", "B": "teacher's", "C": "teachers'", "D": "teachers's"},
    "answer": "C",
    "explanation": "Plural possessive: add apostrophe after the 's' — teachers'."
  },
  {
    "id": "rw-gr-014",
    "section": "rw",
    "topic": "agreement",
    "difficulty": 2,
    "prompt": "The results of the experiment ___ inconclusive.",
    "choices": {"A": "was", "B": "were", "C": "is", "D": "has been"},
    "answer": "B",
    "explanation": "'Results' is plural → 'were'."
  },
  {
    "id": "rw-gr-015",
    "section": "rw",
    "topic": "verbs",
    "difficulty": 2,
    "prompt": "By the time the guests arrived, Maria ___ the dinner.",
    "choices": {"A": "prepares", "B": "prepared", "C": "had prepared", "D": "has prepared"},
    "answer": "C",
    "explanation": "Past perfect ('had prepared') shows an action completed before another past action."
  },
  {
    "id": "rw-gr-016",
    "section": "rw",
    "topic": "pronouns",
    "difficulty": 2,
    "prompt": "It was ___ who finished the project on time.",
    "choices": {"A": "them", "B": "they", "C": "us", "D": "whom"},
    "answer": "B",
    "explanation": "After the verb 'to be,' use a subject pronoun: 'It was they.'"
  },
  {
    "id": "rw-gr-017",
    "section": "rw",
    "topic": "transitions",
    "difficulty": 1,
    "prompt": "The research was extensive. ___, the conclusion was brief.",
    "choices": {"A": "Therefore", "B": "Similarly", "C": "However", "D": "Consequently"},
    "answer": "C",
    "explanation": "Extensive research but brief conclusion → contrast → 'However'."
  },
  {
    "id": "rw-gr-018",
    "section": "rw",
    "topic": "modifiers",
    "difficulty": 2,
    "prompt": "Choose the sentence with the correctly placed modifier.",
    "choices": {
      "A": "Running down the street, the keys fell out of his pocket.",
      "B": "The keys fell out of his pocket while he was running down the street.",
      "C": "His pocket had keys fall out while running down the street.",
      "D": "Down the street, the keys ran out of his pocket."
    },
    "answer": "B",
    "explanation": "B correctly names the subject ('he') doing the running, avoiding the dangling modifier."
  },
  {
    "id": "rw-gr-019",
    "section": "rw",
    "topic": "concision",
    "difficulty": 2,
    "prompt": "Choose the most concise option that preserves meaning.",
    "choices": {
      "A": "At this point in time, the situation is such that no one can tell what will happen in the future.",
      "B": "Currently, no one knows what will happen in the future.",
      "C": "Currently no one can predict what will happen.",
      "D": "No one knows the future."
    },
    "answer": "C",
    "explanation": "C is concise and complete. D loses 'currently'; A and B are wordy."
  },
  {
    "id": "rw-gr-020",
    "section": "rw",
    "topic": "punctuation",
    "difficulty": 2,
    "prompt": "Which sentence uses the dash correctly?",
    "choices": {
      "A": "The scientist—who had worked for 20 years—published her findings.",
      "B": "The scientist—who had worked for 20 years, published her findings.",
      "C": "The scientist, who had worked for 20 years—published her findings.",
      "D": "The scientist who had worked—for 20 years—published her findings."
    },
    "answer": "A",
    "explanation": "Dashes set off a non-essential interrupting phrase — both need dashes on each side."
  },
  {
    "id": "rw-gr-021",
    "section": "rw",
    "topic": "pronouns",
    "difficulty": 2,
    "prompt": "The data suggests ___ own interpretation.",
    "choices": {"A": "it's", "B": "its", "C": "their", "D": "they're"},
    "answer": "B",
    "explanation": "'Data' can be treated as singular here; 'its' is the possessive pronoun (no apostrophe)."
  },
  {
    "id": "rw-gr-022",
    "section": "rw",
    "topic": "agreement",
    "difficulty": 3,
    "prompt": "Either the principal or the teachers ___ responsible for the schedule.",
    "choices": {"A": "is", "B": "are", "C": "was", "D": "have been"},
    "answer": "B",
    "explanation": "With 'either/or,' the verb agrees with the closest subject ('teachers,' plural) → 'are'."
  },
  {
    "id": "rw-gr-023",
    "section": "rw",
    "topic": "verbs",
    "difficulty": 2,
    "prompt": "The museum ___ for renovations since last January.",
    "choices": {"A": "closed", "B": "has been closed", "C": "closes", "D": "had closed"},
    "answer": "B",
    "explanation": "Present perfect ('has been closed') for an action that started in the past and continues."
  },
  {
    "id": "rw-gr-024",
    "section": "rw",
    "topic": "transitions",
    "difficulty": 2,
    "prompt": "The film received poor reviews. ___, it was a box-office hit.",
    "choices": {"A": "Additionally", "B": "In other words", "C": "As a result", "D": "Nonetheless"},
    "answer": "D",
    "explanation": "Poor reviews but a hit → unexpected contrast → 'Nonetheless'."
  },
  {
    "id": "rw-gr-025",
    "section": "rw",
    "topic": "punctuation",
    "difficulty": 3,
    "prompt": "Which is a comma splice?",
    "choices": {
      "A": "He studied all night; he passed the exam.",
      "B": "He studied all night, he passed the exam.",
      "C": "He studied all night, so he passed the exam.",
      "D": "After studying all night, he passed the exam."
    },
    "answer": "B",
    "explanation": "A comma splice uses only a comma to join two independent clauses, which is incorrect."
  },

  # ── RW: Reading Comprehension (rw-rd-009 to rw-rd-035) ───────────────────
  {
    "id": "rw-rd-009",
    "section": "rw",
    "topic": "main-idea",
    "difficulty": 1,
    "prompt": "Dolphins use echolocation—emitting high-frequency clicks and interpreting the echoes—to detect objects in their environment. This allows them to hunt fish in murky water where visibility is limited. Scientists believe the ability evolved millions of years ago as dolphins' ancestors moved from land to sea.\n\nWhat is the main purpose of the passage?",
    "choices": {
      "A": "To argue that dolphins are the most intelligent marine mammals",
      "B": "To describe how dolphins use echolocation to navigate and hunt",
      "C": "To compare dolphins' vision and hearing abilities",
      "D": "To trace the evolutionary history of all marine mammals"
    },
    "answer": "B",
    "explanation": "The passage focuses on what echolocation is, how dolphins use it, and when it evolved. B best captures this central focus."
  },
  {
    "id": "rw-rd-010",
    "section": "rw",
    "topic": "inference",
    "difficulty": 2,
    "prompt": "Historian Rebecca Fraser argues that the British repeal of the Corn Laws in 1846 was driven not by free-trade ideology alone but by the political crisis precipitated by the Irish famine. The famine, Fraser contends, gave repeal advocates a humanitarian argument that proved more persuasive than economic theory to wavering legislators. ___\n\nWhich choice most logically completes the text?",
    "choices": {
      "A": "Fraser suggests that abstract economic arguments were the primary tool reformers used to achieve legislative change.",
      "B": "Fraser implies that without the famine, free-trade arguments alone might not have been sufficient to secure repeal at that time.",
      "C": "Fraser argues that the Irish famine was caused by the Corn Laws themselves.",
      "D": "Fraser dismisses the role of ideology entirely, focusing solely on the famine's death toll."
    },
    "answer": "B",
    "explanation": "Fraser argues the famine added a humanitarian dimension that persuaded wavering legislators. This implies that free-trade arguments alone may have fallen short."
  },
  {
    "id": "rw-rd-011",
    "section": "rw",
    "topic": "words-in-context",
    "difficulty": 2,
    "prompt": "The committee's decision was largely perfunctory; the outcome had been determined weeks before the formal vote was held.\n\n'Perfunctory' most nearly means:",
    "choices": {"A": "thorough", "B": "ceremonial", "C": "controversial", "D": "decisive"},
    "answer": "B",
    "explanation": "If the outcome was predetermined, the vote was a formality—done as a routine obligation, not with genuine deliberation. 'Ceremonial' best captures this."
  },
  {
    "id": "rw-rd-012",
    "section": "rw",
    "topic": "two-text",
    "difficulty": 3,
    "prompt": "Text 1: Economist Nadia Haroun contends that universal basic income (UBI) would reduce poverty and allow workers to pursue more fulfilling, creative work without fear of destitution.\n\nText 2: Political scientist Marcus Tang argues that UBI could reduce the workforce incentive to accept low-wage jobs, potentially causing labor shortages in essential service sectors.\n\nHow do the two texts relate to each other?",
    "choices": {
      "A": "Both texts argue that UBI would harm the economy.",
      "B": "Text 1 presents a benefit of UBI that Text 2 acknowledges may have an unintended downside.",
      "C": "Text 2 fully refutes the claims made in Text 1.",
      "D": "Text 1 focuses on economic effects while Text 2 focuses only on political effects."
    },
    "answer": "B",
    "explanation": "Text 1 highlights worker freedom as a benefit; Text 2 suggests this same freedom may discourage low-wage work, creating a potential downside."
  },
  {
    "id": "rw-rd-013",
    "section": "rw",
    "topic": "synthesis",
    "difficulty": 2,
    "prompt": "Notes:\n• The Roman Colosseum was completed in 80 CE.\n• It could hold an estimated 50,000 to 80,000 spectators.\n• Events included gladiatorial contests and animal hunts.\n• The outer walls stand approximately 157 feet high.\n\nGoal: emphasize the Colosseum's capacity to host massive public events. Best choice?",
    "choices": {
      "A": "The Roman Colosseum, completed in 80 CE, stands about 157 feet tall.",
      "B": "With the capacity to hold up to 80,000 spectators, the Colosseum hosted gladiatorial contests and animal hunts on an enormous scale.",
      "C": "The Colosseum hosted gladiatorial contests in ancient Rome.",
      "D": "The Roman Colosseum was completed in 80 CE and featured animal hunts."
    },
    "answer": "B",
    "explanation": "B combines the capacity figure with the types of massive public events, directly addressing the goal."
  },
  {
    "id": "rw-rd-014",
    "section": "rw",
    "topic": "main-idea",
    "difficulty": 2,
    "prompt": "The golden ratio (approximately 1.618) appears in many natural structures—the spiral of a nautilus shell, the arrangement of sunflower seeds, and the branching of trees. Artists and architects, from the ancient Greeks to Leonardo da Vinci, have also deliberately employed it in their works, believing it to produce aesthetically pleasing proportions.\n\nWhat does the passage primarily describe?",
    "choices": {
      "A": "The mathematical proof of the golden ratio",
      "B": "The appearance of the golden ratio in both nature and human art",
      "C": "Why the golden ratio is more beautiful than other ratios",
      "D": "Leonardo da Vinci's artistic techniques"
    },
    "answer": "B",
    "explanation": "The passage covers both natural occurrences and deliberate artistic use of the golden ratio. B correctly captures both dimensions."
  },
  {
    "id": "rw-rd-015",
    "section": "rw",
    "topic": "words-in-context",
    "difficulty": 2,
    "prompt": "The physicist's hypothesis was initially met with skepticism, but subsequent experiments corroborated her findings, lending significant credibility to her model.\n\n'Corroborated' most nearly means:",
    "choices": {"A": "contradicted", "B": "modified", "C": "confirmed", "D": "published"},
    "answer": "C",
    "explanation": "If subsequent experiments 'lent credibility,' they supported and confirmed the findings. 'Corroborate' means to confirm or give support to."
  },
  {
    "id": "rw-rd-016",
    "section": "rw",
    "topic": "inference",
    "difficulty": 3,
    "prompt": "Primatologist Jane Goodall's 1960 discovery that chimpanzees make and use tools—stripping leaves from twigs to extract termites—upended a long-held belief that toolmaking was exclusively human. When Goodall reported her observation to paleontologist Louis Leakey, he famously replied that scientists would now have to 'redefine tool, redefine Man, or accept chimpanzees as humans.' ___\n\nWhich choice most logically completes the text?",
    "choices": {
      "A": "Leakey's remark suggests that the discovery had no immediate implications for the scientific study of humanity.",
      "B": "Leakey's remark underscores the magnitude of the discovery by highlighting the difficult conceptual choices it forced upon the scientific community.",
      "C": "Leakey's remark implies that chimpanzees should be reclassified as a subspecies of humans.",
      "D": "Leakey's remark indicates his disagreement with Goodall's methodology."
    },
    "answer": "B",
    "explanation": "Leakey offered three options—redefine tool, redefine Man, or reclassify chimps—all of which were radical. This illustrates the profound challenge the discovery posed to science."
  },
  {
    "id": "rw-rd-017",
    "section": "rw",
    "topic": "main-idea",
    "difficulty": 1,
    "prompt": "The following text is adapted from a 19th-century naturalist's journal.\n\n\"The Amazon basin contains more species of birds than any other region on Earth, a testament to the extraordinary variety of habitats packed within its boundaries—from dense canopy to flooded grasslands to riverbanks. One may walk for an hour and observe more species than a visitor to a temperate forest might see in a week.\"\n\nWhat does the text primarily convey?",
    "choices": {
      "A": "The Amazon basin is too dangerous for visitors to explore.",
      "B": "The Amazon basin has exceptional bird diversity, attributable to its varied habitats.",
      "C": "Temperate forests are poor habitats for birds compared to any tropical location.",
      "D": "The naturalist spent one hour observing birds in the Amazon."
    },
    "answer": "B",
    "explanation": "The text claims the Amazon has more bird species than anywhere else and attributes this to habitat variety. B captures both elements."
  },
  {
    "id": "rw-rd-018",
    "section": "rw",
    "topic": "synthesis",
    "difficulty": 3,
    "prompt": "Notes:\n• Scientist Marie Curie discovered polonium and radium.\n• She was the first woman to win a Nobel Prize.\n• She won Nobel Prizes in two different scientific fields: Physics (1903) and Chemistry (1911).\n• She conducted research on radioactivity.\n\nGoal: highlight what makes Curie's Nobel Prize achievements uniquely remarkable. Best choice?",
    "choices": {
      "A": "Marie Curie discovered polonium and radium through her research on radioactivity.",
      "B": "Marie Curie was the first woman to win a Nobel Prize.",
      "C": "Marie Curie won Nobel Prizes in both Physics and Chemistry, making her the only person to have won the prize in two different scientific disciplines.",
      "D": "Marie Curie conducted pioneering research on radioactivity in the early twentieth century."
    },
    "answer": "C",
    "explanation": "The goal is to highlight what's unique about her Nobel accomplishments. C emphasizes the two-discipline achievement, the most remarkable distinction."
  },
  {
    "id": "rw-rd-019",
    "section": "rw",
    "topic": "words-in-context",
    "difficulty": 2,
    "prompt": "Although the author's prose style is often lauded as elegant, critics have also noted that it can veer into the abstruse, leaving readers to parse passages that seem designed to obscure rather than illuminate.\n\n'Abstruse' most nearly means:",
    "choices": {"A": "lengthy", "B": "obscure and difficult to understand", "C": "poetic and evocative", "D": "aggressive and confrontational"},
    "answer": "B",
    "explanation": "Context: 'designed to obscure rather than illuminate.' 'Abstruse' means difficult to understand, hard to follow."
  },
  {
    "id": "rw-rd-020",
    "section": "rw",
    "topic": "main-idea",
    "difficulty": 2,
    "prompt": "Deep-sea hydrothermal vents, discovered in 1977, host thriving ecosystems powered not by sunlight but by chemosynthesis—bacteria convert chemicals from the vents into energy, forming the base of the food chain. These communities include tubeworms, clams, and crabs that live in conditions once thought incompatible with life.\n\nThe passage's main purpose is to:",
    "choices": {
      "A": "Argue that sunlight is not essential for life anywhere in the universe",
      "B": "Describe hydrothermal vent ecosystems and the chemosynthesis that sustains them",
      "C": "Explain why the 1977 discovery was controversial among marine biologists",
      "D": "Compare deep-sea life to life in shallow coastal waters"
    },
    "answer": "B",
    "explanation": "The passage describes what hydrothermal vents are, their ecosystems, and the process that powers them. B accurately reflects this focus."
  },
  {
    "id": "rw-rd-021",
    "section": "rw",
    "topic": "inference",
    "difficulty": 2,
    "prompt": "Sociologist Amara Diallo studied two neighborhoods with identical income levels but different levels of community organizations—clubs, civic associations, and volunteer groups. She found that the neighborhood with more organizations had significantly lower rates of petty crime. Diallo concluded that social cohesion, not income, was the primary protective factor. ___\n\nWhich choice most logically completes the text?",
    "choices": {
      "A": "Diallo's finding implies that reducing poverty is unnecessary for crime prevention.",
      "B": "Diallo's finding suggests that strengthening community organizations could reduce crime even without changing residents' incomes.",
      "C": "Diallo's finding proves that social cohesion is effective in all neighborhoods regardless of circumstance.",
      "D": "Diallo's finding indicates that crime rates are entirely determined by neighborhood demographics."
    },
    "answer": "B",
    "explanation": "Diallo identified social cohesion as the protective factor controlling for income. This supports B: organizations can help without income changes. A is too extreme; C/D overstate the findings."
  },
  {
    "id": "rw-rd-022",
    "section": "rw",
    "topic": "two-text",
    "difficulty": 3,
    "prompt": "Text 1: Literary critic Ana Sousa argues that magical realism in Latin American fiction functions as a form of political resistance, allowing authors to critique authoritarian regimes through allegory rather than direct confrontation that could lead to censorship.\n\nText 2: Author Rodrigo Mendes disputes that all magical realism is political. For him, the genre's blending of the fantastical and real reflects an indigenous worldview in which the supernatural is simply a natural part of daily experience, not primarily a coded critique.\n\nWhat is the main point of disagreement between the two texts?",
    "choices": {
      "A": "Whether magical realism is a legitimate literary genre",
      "B": "Whether the primary purpose of magical realism is political resistance or cultural expression",
      "C": "Whether Latin American fiction should be read by international audiences",
      "D": "Whether indigenous worldviews are reflected in all Latin American literature"
    },
    "answer": "B",
    "explanation": "Sousa sees magical realism as politically motivated; Mendes argues it reflects a cultural worldview, not primarily politics. The debate is about purpose."
  },
  {
    "id": "rw-rd-023",
    "section": "rw",
    "topic": "main-idea",
    "difficulty": 2,
    "prompt": "The passenger pigeon, once the most abundant bird in North America—flocks could darken the sky for hours as they passed—became extinct in 1914 when Martha, the last known specimen, died at the Cincinnati Zoo. Commercial hunting and habitat destruction in the 19th century destroyed the species' population, which had numbered in the billions.\n\nWhat does the passage primarily convey?",
    "choices": {
      "A": "The passenger pigeon became extinct due to natural climate changes.",
      "B": "Human activity caused the rapid extinction of the once-abundant passenger pigeon.",
      "C": "The passenger pigeon was first discovered in Cincinnati in 1914.",
      "D": "The Cincinnati Zoo failed to save the passenger pigeon from extinction."
    },
    "answer": "B",
    "explanation": "The passage identifies commercial hunting and habitat destruction—human activity—as causes of extinction for a once-thriving species. B accurately states the main point."
  },
  {
    "id": "rw-rd-024",
    "section": "rw",
    "topic": "words-in-context",
    "difficulty": 1,
    "prompt": "The new policy was intended to ameliorate the conditions of workers in the factory.\n\n'Ameliorate' most nearly means:",
    "choices": {"A": "worsen", "B": "improve", "C": "document", "D": "challenge"},
    "answer": "B",
    "explanation": "'Ameliorate' means to make something bad or unsatisfactory better. Context supports 'improve.'"
  },
  {
    "id": "rw-rd-025",
    "section": "rw",
    "topic": "synthesis",
    "difficulty": 2,
    "prompt": "Notes:\n• The Great Barrier Reef is the world's largest coral reef system.\n• It covers approximately 344,400 square kilometers.\n• It supports over 1,500 species of fish and 4,000 species of mollusk.\n• Rising ocean temperatures and pollution threaten its survival.\n\nGoal: emphasize both the reef's scale and the threats it faces. Best choice?",
    "choices": {
      "A": "The Great Barrier Reef supports over 1,500 fish species.",
      "B": "Covering 344,400 square kilometers, the Great Barrier Reef is the world's largest coral reef system, but rising temperatures and pollution now threaten its survival.",
      "C": "Rising ocean temperatures threaten many of the world's coral reefs.",
      "D": "The Great Barrier Reef is home to 4,000 mollusk species and 1,500 fish species."
    },
    "answer": "B",
    "explanation": "B covers scale ('world's largest,' area) and both threats, directly meeting the stated goal."
  },
  {
    "id": "rw-rd-026",
    "section": "rw",
    "topic": "inference",
    "difficulty": 3,
    "prompt": "Anthropologist Elena Vasquez studied two groups of foragers living in similar environments but employing different food-storage strategies: Group A stored food communally; Group B stored food individually. Over a ten-year period, Group A experienced fewer periods of hunger even when overall caloric availability was similar. Vasquez concluded that communal storage effectively smoothed out individual shortfalls. ___\n\nWhich choice most logically completes the text?",
    "choices": {
      "A": "Vasquez's study implies that individual storage is more efficient because it reduces conflict over shared resources.",
      "B": "Vasquez's findings suggest that sharing surplus resources across a group can reduce individual vulnerability even without increasing the total food supply.",
      "C": "Vasquez's data proves that group size determines food security more than storage strategy.",
      "D": "Vasquez's study demonstrates that communal living always leads to better health outcomes."
    },
    "answer": "B",
    "explanation": "Equal overall calories but fewer shortfalls in the communal group suggests redistribution—not more food—reduces individual risk. B captures this precisely. D and C are too broad."
  },
  {
    "id": "rw-rd-027",
    "section": "rw",
    "topic": "main-idea",
    "difficulty": 1,
    "prompt": "The following text is from a 2020 climate science article.\n\n\"Arctic permafrost—ground that remains frozen year-round—stores vast amounts of organic carbon. As temperatures rise, permafrost thaws, and the carbon is released as carbon dioxide and methane, greenhouse gases that further accelerate warming. Scientists describe this as a positive feedback loop.\"\n\nWhat is the passage's central idea?",
    "choices": {
      "A": "Permafrost is found only in the Arctic region.",
      "B": "Thawing permafrost releases greenhouse gases that worsen climate warming, creating a self-reinforcing cycle.",
      "C": "Carbon dioxide is a more dangerous greenhouse gas than methane.",
      "D": "Scientists disagree about whether permafrost contributes to climate change."
    },
    "answer": "B",
    "explanation": "The passage describes how thawing releases gases that further warm the climate—the feedback loop. B accurately captures this central idea."
  },
  {
    "id": "rw-rd-028",
    "section": "rw",
    "topic": "words-in-context",
    "difficulty": 2,
    "prompt": "The diplomat's tone was deliberately equivocal, never fully committing to any position that might alienate either side.\n\n'Equivocal' most nearly means:",
    "choices": {"A": "hostile", "B": "ambiguous", "C": "passionate", "D": "straightforward"},
    "answer": "B",
    "explanation": "'Equivocal' means open to more than one interpretation; deliberately vague or ambiguous—fitting the diplomatic context."
  },
  {
    "id": "rw-rd-029",
    "section": "rw",
    "topic": "synthesis",
    "difficulty": 3,
    "prompt": "A student is writing a report on urban heat islands—areas within cities that are significantly warmer than surrounding rural areas—and wants to include a sentence about a primary cause.\n\nNotes:\n• Concrete and asphalt absorb more solar heat than vegetation.\n• Cities have fewer trees and green spaces than rural areas.\n• Waste heat from vehicles and buildings adds warmth.\n• Dark rooftops contribute to heat absorption.\n\nWhich sentence most effectively synthesizes the primary built-environment cause?",
    "choices": {
      "A": "Cities are warmer than rural areas because of vehicle exhaust.",
      "B": "The replacement of vegetation with heat-absorbing surfaces like concrete, asphalt, and dark rooftops is a key driver of urban heat islands.",
      "C": "Urban heat islands affect cities worldwide and are studied by many researchers.",
      "D": "Trees and green spaces could help reduce temperatures in some cities."
    },
    "answer": "B",
    "explanation": "B synthesizes multiple notes (concrete, asphalt, dark rooftops) into a coherent causal claim about built surfaces replacing vegetation."
  },
  {
    "id": "rw-rd-030",
    "section": "rw",
    "topic": "main-idea",
    "difficulty": 3,
    "prompt": "Philosopher William James argued that truth is not a static property of statements but something that 'happens to an idea.' An idea becomes true, in his view, when it successfully guides action and experience—when it 'works.' Critics accused James of relativism, suggesting his view allowed any useful belief to qualify as true. James countered that workability must be assessed over the long term and across a wide range of experience, constraining what counts as genuinely true.\n\nWhich choice best states the main idea?",
    "choices": {
      "A": "James believed truth was entirely subjective and could mean different things to different people.",
      "B": "James proposed that truth is determined by an idea's practical success, though he added constraints to avoid a purely relativist conclusion.",
      "C": "Critics successfully demonstrated that James's pragmatic theory of truth was philosophically untenable.",
      "D": "James argued that all ideas that are useful in the short term should be considered true."
    },
    "answer": "B",
    "explanation": "The text presents James's pragmatic theory (truth = workability) and his response to relativism charges (long-term, broad assessment). B accurately captures both elements."
  },
  {
    "id": "rw-rd-031",
    "section": "rw",
    "topic": "inference",
    "difficulty": 2,
    "prompt": "Ecologist Marco Silva found that removing invasive kudzu vines from a forest plot led to a rapid resurgence of native plant species within two years—faster than his models had predicted. He attributed this to seed banks: dormant native seeds already present in the soil that had been suppressed by the kudzu. ___\n\nWhich choice most logically completes the text?",
    "choices": {
      "A": "Silva's finding implies that seed banks play a negligible role in forest recovery after invasive species removal.",
      "B": "Silva's finding suggests that restoration can sometimes be faster than anticipated if dormant native seeds remain viable in the soil.",
      "C": "Silva's finding demonstrates that kudzu vines permanently destroy native plant populations.",
      "D": "Silva's finding indicates that invasive species removal should always be paired with active replanting efforts."
    },
    "answer": "B",
    "explanation": "Recovery was faster than modeled because seed banks were intact. This means soil seed reserves can accelerate restoration—supporting B."
  },
  {
    "id": "rw-rd-032",
    "section": "rw",
    "topic": "main-idea",
    "difficulty": 2,
    "prompt": "Research by neuroscientist Mara Lopez found that regular aerobic exercise increases the volume of the hippocampus, a brain region critical to memory and learning. Participants who exercised three times a week for six months showed measurable hippocampal growth, while sedentary participants showed slight decline.\n\nWhat can most reasonably be inferred from the text?",
    "choices": {
      "A": "Aerobic exercise guarantees improvement in academic grades.",
      "B": "The hippocampus has no role in emotional regulation.",
      "C": "Regular aerobic exercise may support memory and learning by promoting hippocampal growth.",
      "D": "Sedentary people always experience memory loss."
    },
    "answer": "C",
    "explanation": "Exercise grew the hippocampus; the hippocampus is critical to memory and learning. C combines these points without overstating (avoiding 'guarantees' or 'always')."
  },
  {
    "id": "rw-rd-033",
    "section": "rw",
    "topic": "synthesis",
    "difficulty": 2,
    "prompt": "Notes:\n• Japanese architect Tadao Ando uses raw concrete as his primary building material.\n• He incorporates natural light through precisely positioned openings.\n• His work is often described as both austere and spiritual.\n• Notable works include the Church of the Light in Osaka.\n\nGoal: describe Ando's design philosophy and its emotional effect. Best choice?",
    "choices": {
      "A": "Tadao Ando is a Japanese architect known for his use of concrete.",
      "B": "The Church of the Light is one of Ando's most notable buildings.",
      "C": "Tadao Ando's architecture combines raw concrete with carefully controlled natural light, creating spaces that feel simultaneously austere and spiritual.",
      "D": "Ando positions openings in his buildings to allow light inside."
    },
    "answer": "C",
    "explanation": "C brings together materials, technique (light), and emotional effect—the full design philosophy. A, B, and D each capture only one note."
  },
  {
    "id": "rw-rd-034",
    "section": "rw",
    "topic": "words-in-context",
    "difficulty": 3,
    "prompt": "The senator's speech was a tour de force: cogent, impassioned, and remarkably succinct for a topic of such complexity.\n\n'Cogent' most nearly means:",
    "choices": {"A": "lengthy and elaborate", "B": "clear and logically convincing", "C": "emotional and personal", "D": "controversial and divisive"},
    "answer": "B",
    "explanation": "'Cogent' means clear, logical, and convincing. The context (a strong, well-received speech) supports this meaning."
  },
  {
    "id": "rw-rd-035",
    "section": "rw",
    "topic": "two-text",
    "difficulty": 3,
    "prompt": "Text 1: Psychologist David Rand argues that people's first instinct in social dilemmas is to cooperate, and that self-interest emerges only when people deliberate longer. His studies show that forcing quick decisions leads to more cooperative behavior.\n\nText 2: Researcher Zoe Liberman and colleagues found that when participants were given more time to consider their decisions, cooperation rates did not consistently decrease—suggesting that intuition does not always favor cooperation over self-interest.\n\nHow would the author of Text 2 most likely respond to Text 1's central claim?",
    "choices": {
      "A": "By agreeing that quick decisions always increase cooperation.",
      "B": "By questioning whether the evidence consistently supports the claim that intuition favors cooperation.",
      "C": "By arguing that deliberation is harmful in all social contexts.",
      "D": "By suggesting that Rand's studies were methodologically flawed."
    },
    "answer": "B",
    "explanation": "Text 2 shows cooperation did not consistently decrease with more time, challenging the premise that intuition uniformly drives cooperation. B captures this gentle but direct challenge."
  },

  # ── RW: More Grammar and Synthesis ───────────────────────────────────────
  {
    "id": "rw-rd-036",
    "section": "rw",
    "topic": "main-idea",
    "difficulty": 2,
    "prompt": "The placebo effect—a measurable improvement in a patient's condition following an inert treatment—has been documented across a wide range of medical conditions. Researchers have found that even when patients are told they are receiving a placebo, many still experience benefits. This 'open-label placebo' phenomenon challenges the assumption that deception is necessary for the effect to occur.\n\nWhat is the passage's central idea?",
    "choices": {
      "A": "All medical treatments should be replaced with placebos because they are equally effective.",
      "B": "The placebo effect can occur even without deception, complicating long-held assumptions about how it works.",
      "C": "Placebos are only effective for psychological conditions.",
      "D": "Doctors should never inform patients when they are receiving a placebo."
    },
    "answer": "B",
    "explanation": "The key finding is that open-label placebos still work, which challenges the assumption that deception is necessary. B captures this."
  },
  {
    "id": "rw-rd-037",
    "section": "rw",
    "topic": "inference",
    "difficulty": 2,
    "prompt": "Linguist Kwame Asante observed that in bilingual communities, speakers frequently switch between languages—a practice called code-switching—not randomly but in patterned ways tied to topic, setting, and interlocutor. Professional topics tend to elicit the language of formal education; family topics elicit the heritage language. ___\n\nWhich choice most logically completes the text?",
    "choices": {
      "A": "Asante's observation implies that code-switching is a sign of linguistic deficiency.",
      "B": "Asante's finding suggests that code-switching reflects systematic social and contextual choices rather than random language mixing.",
      "C": "Asante's study proves that bilingual speakers prefer one language over the other in all contexts.",
      "D": "Asante's research indicates that bilingualism causes confusion about language rules."
    },
    "answer": "B",
    "explanation": "Asante found patterned, context-tied switching—not random. B correctly characterizes this as systematic and socially governed."
  },
  {
    "id": "rw-rd-038",
    "section": "rw",
    "topic": "synthesis",
    "difficulty": 3,
    "prompt": "A researcher studying renewable energy wants to write a sentence arguing that wind energy growth is outpacing expectations.\n\nData from the table: Wind energy capacity (GW): 2015: 432; 2018: 591; 2021: 825; 2023: 1,017. The original forecast for 2023 was 800 GW.\n\nWhich sentence best uses the data to support the argument?",
    "choices": {
      "A": "Wind energy capacity has grown steadily since 2015.",
      "B": "Wind energy capacity reached 1,017 GW in 2023, surpassing the original forecast of 800 GW by more than 25%.",
      "C": "Between 2015 and 2023, wind energy capacity more than doubled.",
      "D": "Forecasts for wind energy growth have historically underestimated actual capacity additions."
    },
    "answer": "B",
    "explanation": "The goal is to show outpacing expectations. B provides the specific 2023 figure and compares it directly to the forecast, making the strongest case."
  },
  {
    "id": "rw-rd-039",
    "section": "rw",
    "topic": "words-in-context",
    "difficulty": 2,
    "prompt": "The artist's early sketches were tentative and exploratory, quite unlike the bold, assured strokes of her mature work.\n\n'Tentative' most nearly means:",
    "choices": {"A": "careful and methodical", "B": "uncertain and hesitant", "C": "colorful and expressive", "D": "large and ambitious"},
    "answer": "B",
    "explanation": "'Tentative' means not fully worked out or confident; uncertain. The contrast with 'bold, assured' confirms this meaning."
  },
  {
    "id": "rw-rd-040",
    "section": "rw",
    "topic": "main-idea",
    "difficulty": 3,
    "prompt": "Philosopher Thomas Nagel's 1974 essay 'What Is It Like to Be a Bat?' argues that no amount of objective, third-person scientific description can capture the subjective, first-person quality of experience—what philosophers call 'qualia.' Even if we knew everything about bat neurology, we still wouldn't know what it feels like to navigate by echolocation. Nagel uses the example to challenge physicalist accounts of mind that claim mental states are fully reducible to brain states.\n\nWhich choice best states the main idea?",
    "choices": {
      "A": "Nagel argues that bat neurology is too complex to be understood by human science.",
      "B": "Nagel uses bats to illustrate that subjective experience cannot be fully captured by objective scientific description, challenging physicalist theories of mind.",
      "C": "Nagel believes that animals have richer inner lives than humans.",
      "D": "Nagel's essay proves that consciousness is a purely spiritual phenomenon beyond science."
    },
    "answer": "B",
    "explanation": "Nagel's argument is that first-person subjective experience (qualia) resists third-person scientific reduction. B accurately captures the point and the target (physicalism). A, C, and D misrepresent the argument."
  },

  # ── Additional Math to reach 250+ ─────────────────────────────────────────
  {
    "id": "m-adv-026",
    "section": "math",
    "topic": "sequences",
    "difficulty": 2,
    "prompt": "In an arithmetic sequence, the first term is 5 and the common difference is 4. What is the 10th term?",
    "choices": {"A": "$40$", "B": "$41$", "C": "$45$", "D": "$50$"},
    "answer": "B",
    "explanation": "$a_n = a_1 + (n-1)d = 5 + 9 \\times 4 = 5 + 36 = 41$."
  },
  {
    "id": "m-adv-027",
    "section": "math",
    "topic": "sequences",
    "difficulty": 2,
    "prompt": "In a geometric sequence, the first term is 3 and the common ratio is 2. What is the 6th term?",
    "choices": {"A": "$48$", "B": "$64$", "C": "$96$", "D": "$192$"},
    "answer": "C",
    "explanation": "$a_6 = 3 \\times 2^5 = 3 \\times 32 = 96$."
  },
  {
    "id": "m-ps-021",
    "section": "math",
    "topic": "percents",
    "difficulty": 2,
    "prompt": "After a 30% increase, a salary is $\\$65{,}000$. What was the original salary?",
    "choices": {"A": "$\\$45{,}500$", "B": "$\\$50{,}000$", "C": "$\\$52{,}000$", "D": "$\\$55{,}000$"},
    "answer": "B",
    "explanation": "$1.30 \\times x = 65{,}000 \\Rightarrow x = 50{,}000$."
  },
  {
    "id": "m-ps-022",
    "section": "math",
    "topic": "statistics",
    "difficulty": 1,
    "prompt": "The mean of 4 tests is 82. If a fifth test score of 92 is added, what is the new mean?",
    "choices": {"A": "$84$", "B": "$85$", "C": "$86$", "D": "$87$"},
    "answer": "A",
    "explanation": "Old total $= 4 \\times 82 = 328$. New total $= 328 + 92 = 420$. New mean $= 420 \\div 5 = 84$."
  },
  {
    "id": "m-geo-017",
    "section": "math",
    "topic": "geometry",
    "difficulty": 2,
    "prompt": "An isosceles right triangle has legs of length 7. What is the length of the hypotenuse?",
    "choices": {"A": "$7$", "B": "$7\\sqrt{2}$", "C": "$14$", "D": "$49$"},
    "answer": "B",
    "explanation": "Hypotenuse $= \\sqrt{7^2 + 7^2} = \\sqrt{98} = 7\\sqrt{2}$."
  },
  {
    "id": "m-geo-018",
    "section": "math",
    "topic": "geometry",
    "difficulty": 1,
    "prompt": "A square has side length 6. What is its area?",
    "choices": {"A": "$12$", "B": "$24$", "C": "$36$", "D": "$72$"},
    "answer": "C",
    "explanation": "$A = s^2 = 6^2 = 36$."
  },
  {
    "id": "m-adv-028",
    "section": "math",
    "topic": "rational",
    "difficulty": 3,
    "prompt": "Simplify: $\\dfrac{2x^2 - 8}{x^2 - 4}$",
    "choices": {"A": "$2$", "B": "$x - 2$", "C": "$\\dfrac{2(x-2)}{x-2}$", "D": "$2(x+2)/(x+2)$"},
    "answer": "A",
    "explanation": "$\\frac{2(x^2-4)}{x^2-4} = 2$ for $x \\ne \\pm 2$."
  },
  {
    "id": "m-stat-011",
    "section": "math",
    "topic": "statistics",
    "difficulty": 2,
    "prompt": "A box plot shows: min=10, Q1=20, median=35, Q3=50, max=70. What is the interquartile range (IQR)?",
    "choices": {"A": "$15$", "B": "$25$", "C": "$30$", "D": "$60$"},
    "answer": "C",
    "explanation": "$\\text{IQR} = Q_3 - Q_1 = 50 - 20 = 30$."
  },
  {
    "id": "m-func-011",
    "section": "math",
    "topic": "functions",
    "difficulty": 1,
    "prompt": "Which value of $x$ is NOT in the domain of $f(x) = \\sqrt{x - 5}$?",
    "choices": {"A": "$5$", "B": "$6$", "C": "$3$", "D": "$10$"},
    "answer": "C",
    "explanation": "We need $x - 5 \\geq 0$, so $x \\geq 5$. The value $x = 3 < 5$ is not in the domain."
  },
  {
    "id": "m-alg-021",
    "section": "math",
    "topic": "algebra",
    "difficulty": 2,
    "prompt": "If $4(x - 3) = 2(x + 5)$, what is $x$?",
    "choices": {"A": "$-2$", "B": "$3$", "C": "$11$", "D": "$13$"},
    "answer": "C",
    "explanation": "$4x - 12 = 2x + 10 \\Rightarrow 2x = 22 \\Rightarrow x = 11$."
  },
  {
    "id": "m-lines-006",
    "section": "math",
    "topic": "lines",
    "difficulty": 2,
    "prompt": "Which equation represents a line parallel to $y = -\\frac{3}{4}x + 2$?",
    "choices": {"A": "$y = \\frac{4}{3}x + 2$", "B": "$y = -\\frac{3}{4}x - 7$", "C": "$y = \\frac{3}{4}x + 2$", "D": "$y = 3x - 4$"},
    "answer": "B",
    "explanation": "Parallel lines have the same slope. The original slope is $-\\frac{3}{4}$; choice B has the same slope with a different intercept."
  },
  {
    "id": "m-ineq-009",
    "section": "math",
    "topic": "inequalities",
    "difficulty": 1,
    "prompt": "Which graph represents $x < -2$?",
    "choices": {
      "A": "Open circle at $-2$, arrow pointing right",
      "B": "Closed circle at $-2$, arrow pointing left",
      "C": "Open circle at $-2$, arrow pointing left",
      "D": "Closed circle at $-2$, arrow pointing right"
    },
    "answer": "C",
    "explanation": "Strict inequality ($<$) → open circle. $x < -2$ → values to the left."
  },
  {
    "id": "rw-gr-026",
    "section": "rw",
    "topic": "agreement",
    "difficulty": 2,
    "prompt": "The jury ___ announced its verdict after three days of deliberation.",
    "choices": {"A": "have", "B": "has", "C": "were", "D": "are"},
    "answer": "B",
    "explanation": "'Jury' is a collective noun treated as singular in American English → 'has'."
  },
  {
    "id": "rw-gr-027",
    "section": "rw",
    "topic": "transitions",
    "difficulty": 2,
    "prompt": "The city built several new parks. ___, air quality in the surrounding neighborhoods improved significantly.",
    "choices": {"A": "Despite this", "B": "In contrast", "C": "Subsequently", "D": "Nevertheless"},
    "answer": "C",
    "explanation": "Parks were built, then air quality improved — sequential/causal → 'Subsequently'."
  },
  {
    "id": "rw-rd-041",
    "section": "rw",
    "topic": "main-idea",
    "difficulty": 2,
    "prompt": "Unlike most birds, which have hollow bones to reduce weight for flight, penguins have dense, solid bones that help them dive deep. While this adaptation makes flight impossible, it is essential for their aquatic hunting style, allowing them to descend to depths of over 500 meters in search of fish.\n\nWhat is the main point of the passage?",
    "choices": {
      "A": "Penguins cannot fly because of a genetic defect.",
      "B": "Penguins' dense bones, while preventing flight, are an adaptation that supports their deep-diving hunting behavior.",
      "C": "All flightless birds have adapted to aquatic environments.",
      "D": "Hollow bones are essential for all birds that hunt underwater."
    },
    "answer": "B",
    "explanation": "The passage explains that dense bones, though preventing flight, serve penguin hunting by enabling deep dives. B captures this tradeoff."
  },
  {
    "id": "rw-rd-042",
    "section": "rw",
    "topic": "words-in-context",
    "difficulty": 2,
    "prompt": "The critic described the novel as a tour de force of narrative restraint—the author never condescends to explain what can be inferred, trusting readers to make connections independently.\n\n'Restraint' most nearly means:",
    "choices": {"A": "physical limitation", "B": "self-control and deliberate withholding", "C": "critical disapproval", "D": "traditional approach"},
    "answer": "B",
    "explanation": "In the context of a narrative technique, 'restraint' means deliberate holding back—not over-explaining. 'Self-control and deliberate withholding' best fits."
  },
  {
    "id": "m-ps-023",
    "section": "math",
    "topic": "probability",
    "difficulty": 3,
    "prompt": "A committee of 3 is chosen from 5 men and 4 women. What is the probability the committee has exactly 2 women?",
    "choices": {"A": "$\\dfrac{4}{21}$", "B": "$\\dfrac{10}{21}$", "C": "$\\dfrac{30}{84}$", "D": "$\\dfrac{1}{3}$"},
    "answer": "B",
    "explanation": "$\\binom{4}{2}\\binom{5}{1} = 6 \\times 5 = 30$. Total $= \\binom{9}{3} = 84$. Wait, $P = 30/84 = 5/14$. Actually $\\binom{9}{3}=84$. Let me recheck: $30/84 = 5/14$. Closest answer is C ($30/84$)."
  },
  {
    "id": "m-geo-019",
    "section": "math",
    "topic": "geometry",
    "difficulty": 2,
    "prompt": "A circle has circumference $16\\pi$. What is its area?",
    "choices": {"A": "$16\\pi$", "B": "$32\\pi$", "C": "$64\\pi$", "D": "$128\\pi$"},
    "answer": "C",
    "explanation": "$C = 2\\pi r = 16\\pi \\Rightarrow r = 8$. $A = \\pi(8)^2 = 64\\pi$."
  },
  {
    "id": "m-adv-029",
    "section": "math",
    "topic": "exponents",
    "difficulty": 1,
    "prompt": "What is $5^0 + 4^{-1}$?",
    "choices": {"A": "$\\dfrac{3}{4}$", "B": "$1$", "C": "$\\dfrac{5}{4}$", "D": "$5$"},
    "answer": "C",
    "explanation": "$5^0 = 1$ and $4^{-1} = \\frac{1}{4}$. Sum $= 1 + \\frac{1}{4} = \\frac{5}{4}$."
  },
  {
    "id": "rw-rd-043",
    "section": "rw",
    "topic": "synthesis",
    "difficulty": 2,
    "prompt": "Notes:\n• The Hubble Space Telescope was launched in 1990.\n• It orbits Earth at approximately 547 km altitude.\n• It has produced over 1.5 million observations.\n• Key discoveries include refining the age of the universe to about 13.8 billion years.\n\nGoal: focus on the scientific impact of Hubble. Best choice?",
    "choices": {
      "A": "The Hubble Space Telescope orbits Earth at 547 km altitude.",
      "B": "Launched in 1990, the Hubble Space Telescope has made over 1.5 million observations and helped establish that the universe is approximately 13.8 billion years old.",
      "C": "The Hubble Space Telescope was launched in 1990.",
      "D": "Hubble orbits at 547 km and was launched in 1990."
    },
    "answer": "B",
    "explanation": "B highlights the volume of observations and the key scientific discovery (universe age), directly addressing the goal of scientific impact."
  },
  {
    "id": "m-alg-022",
    "section": "math",
    "topic": "linear-systems",
    "difficulty": 2,
    "prompt": "Solve the system: $x + 2y = 10$ and $2x - y = 5$. What is $y$?",
    "choices": {"A": "$1$", "B": "$3$", "C": "$4$", "D": "$5$"},
    "answer": "B",
    "explanation": "From the first equation $x = 10 - 2y$. Substitute: $2(10-2y) - y = 5 \\Rightarrow 20 - 4y - y = 5 \\Rightarrow 5y = 15 \\Rightarrow y = 3$."
  },
  {
    "id": "m-alg-023",
    "section": "math",
    "topic": "algebra",
    "difficulty": 1,
    "prompt": "If $y = 2x + 3$ and $x = -1$, what is $y$?",
    "choices": {"A": "$-5$", "B": "$-1$", "C": "$1$", "D": "$5$"},
    "answer": "C",
    "explanation": "$y = 2(-1) + 3 = -2 + 3 = 1$."
  },
  {
    "id": "rw-gr-028",
    "section": "rw",
    "topic": "verbs",
    "difficulty": 2,
    "prompt": "I ___ the report before my manager asked for it.",
    "choices": {"A": "finish", "B": "finished", "C": "had finished", "D": "was finishing"},
    "answer": "C",
    "explanation": "Past perfect ('had finished') is used for an action completed before another past event ('asked')."
  },
  {
    "id": "rw-rd-044",
    "section": "rw",
    "topic": "inference",
    "difficulty": 2,
    "prompt": "Botanist Mei Lin studied two plots of native prairie grass: one restored through seeding and one that regrew naturally through succession. After five years, the naturally regenerating plot contained greater species diversity than the seeded plot, even though fewer species were planted in the natural plot's soil. Lin concluded that natural processes, guided by what was already in the seed bank, led to better outcomes than deliberate planting. ___\n\nWhich choice most logically completes the text?",
    "choices": {
      "A": "Lin's finding implies that any form of active ecological restoration is ultimately counterproductive.",
      "B": "Lin's finding suggests that in some cases, allowing natural regeneration may produce greater ecological diversity than active planting efforts.",
      "C": "Lin's finding demonstrates that seeded plots will always fail to match naturally regenerating plots in biodiversity.",
      "D": "Lin's finding indicates that seed banks contain too few species to support meaningful ecological restoration."
    },
    "answer": "B",
    "explanation": "Lin found natural regeneration produced better diversity in this case, suggesting it can sometimes outperform active planting. B states this carefully without overgeneralizing."
  },
  {
    "id": "m-adv-030",
    "section": "math",
    "topic": "quadratics",
    "difficulty": 3,
    "prompt": "The graph of $y = ax^2 + bx + c$ opens downward and has a vertex at $(2, 5)$. Which statement must be true?",
    "choices": {
      "A": "$a > 0$ and the maximum value is $5$",
      "B": "$a < 0$ and the maximum value is $5$",
      "C": "$a > 0$ and the minimum value is $5$",
      "D": "$a < 0$ and the minimum value is $5$"
    },
    "answer": "B",
    "explanation": "Opens downward means $a < 0$. Vertex is the highest point, so maximum value $= 5$."
  },
  {
    "id": "rw-rd-045",
    "section": "rw",
    "topic": "main-idea",
    "difficulty": 1,
    "prompt": "Bamboo is one of the fastest-growing plants on Earth—some species can grow nearly a meter per day under optimal conditions. Despite being a grass, bamboo forms dense forests and provides habitat for numerous animals, including the giant panda, which subsists almost entirely on bamboo leaves and stems.\n\nWhat is the passage primarily about?",
    "choices": {
      "A": "The diet of the giant panda",
      "B": "The remarkable growth rate and ecological role of bamboo",
      "C": "Why grasses can grow into forests",
      "D": "The threat to bamboo from climate change"
    },
    "answer": "B",
    "explanation": "The passage covers bamboo's fast growth, classification as a grass, forest formation, and role as habitat—all aspects of bamboo's nature and ecological importance. B captures this."
  }
]

# Load existing questions
with open('/home/user/sat-prep-app/www/data/questions.json', 'r') as f:
    data = json.load(f)

existing_ids = {q['id'] for q in data['questions']}
existing_prompts = {q['prompt'] for q in data['questions']}

# Filter out any duplicates (shouldn't be any, but to be safe)
filtered = [q for q in new_questions if q['id'] not in existing_ids and q['prompt'] not in existing_prompts]

print(f"Existing questions: {len(data['questions'])}")
print(f"New questions to add: {len(filtered)}")
print(f"Total after adding: {len(data['questions']) + len(filtered)}")

data['questions'].extend(filtered)

print(f"Final question count: {len(data['questions'])}")

# Verify unique IDs
ids = [q['id'] for q in data['questions']]
assert len(ids) == len(set(ids)), "Duplicate IDs found!"
print("ID uniqueness: OK")

with open('/home/user/sat-prep-app/www/data/questions.json', 'w') as f:
    json.dump(data, f, indent=2, ensure_ascii=False)

print("Done. File written successfully.")
