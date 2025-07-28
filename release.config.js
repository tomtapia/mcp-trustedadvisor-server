module.exports = {
  branches: ['main'],
  plugins: [
    [
      '@semantic-release/commit-analyzer',
      {
        preset: 'conventionalcommits' // usa el estándar Conventional Commits (v1.0.0)
      }
    ],
    '@semantic-release/release-notes-generator',
    [
      '@semantic-release/npm',
      {
        npmPublish: true,
        pkgRoot: '.'
      }
    ],
    [
      '@semantic-release/github',
      {
        // Assets a incluir en el release
        assets: [
          // Documentación principal
          {
            path: 'README.md',
            label: 'Documentation (README.md)'
          },
          // Configuraciones de ejemplo para diferentes clientes MCP
          {
            path: 'examples/claude-desktop-config.json',
            label: 'Claude Desktop Configuration Example'
          },
          {
            path: 'examples/amazon-q-config.json',
            label: 'Amazon Q Developer Configuration Example'
          },
          {
            path: 'examples/aws-iam-policy.json',
            label: 'Required AWS IAM Policy'
          }
        ],
        
        // Comentarios automáticos en issues y PRs
        successComment: '🎉 This ${issue.pull_request ? "PR is included" : "issue has been resolved"} in version ${nextRelease.version}!\n\n📦 **Installation**: `npm install mcp-trustedadvisor-server@${nextRelease.version}`',
        failTitle: '🚨 Automated release failed',
        failComment: 'The automated release from the `${branch.name}` branch failed. Please check the [CI logs](${env.GITHUB_SERVER_URL}/${env.GITHUB_REPOSITORY}/actions/runs/${env.GITHUB_RUN_ID}) for details.',
        
        // Labels para gestión de releases
        releasedLabels: ['released'],
        addReleases: 'bottom'
      }
    ]
  ]
};
