# Security Policy

## Supported Versions

Security updates are provided for the latest version of Maliang Deck.

| Version | Supported |
| --- | --- |
| Latest | Yes |
| Older versions | No |

## Reporting A Vulnerability

Please report security vulnerabilities privately rather than through public
GitHub issues. This gives the project time to investigate and prepare a fix
before details are widely visible.

Report vulnerabilities privately by emailing:

```text
jiefeng.zhou37@gmail.com
```

Include:

- a description of the vulnerability;
- steps to reproduce it;
- expected and actual behavior;
- potential impact;
- affected operating system, Node.js version, Python version, and deck/project
  inputs when relevant;
- any suggested fix or mitigation.

We aim to acknowledge reports within 72 hours and provide a resolution timeline
within 7 days when the report is in scope.

## Scope

In scope:

- source code in this repository;
- CLI commands;
- schema validation;
- HTML and SVG renderers;
- PDF and PPTX export bridges;
- workflow commands;
- generated HTML runtime behavior;
- archive, source-material, or document handling code.

Out of scope:

- third-party AI tools or model providers;
- third-party extraction services;
- user-provided source documents themselves;
- generated decks after they have been manually modified outside Maliang Deck;
- vulnerabilities in dependencies that do not require a Maliang Deck fix.

Reports involving interactions between these out-of-scope systems and Maliang
Deck are still useful and may be reviewed.

## Disclosure

Please give the maintainer reasonable time to investigate and fix confirmed
issues before public disclosure. Reporter credit can be included unless you ask
to remain anonymous.
