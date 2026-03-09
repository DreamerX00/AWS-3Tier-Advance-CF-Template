# Chapter 8: Secrets Management and Injection

The number one rule of Infrastructure as Code: **Never hardcode secrets in templates, task definitions, Docker files, or CI/CD pipeline variables unless absolutely unavoidable.**

If a credential exists in plain text in a `.yaml` file, it is compromised. If it exists in a GitHub Actions variable and gets printed to the logs, it is compromised.

## The Secrets Manager Pattern
AWS Secrets Manager (and SSM Parameter Store) are designed to hold sensitive strings. The fundamental pattern is:
1.  Store the secret in Secrets Manager (often generated there so no human ever knows it).
2.  Pass the *Reference* (the ARN) to the infrastructure.
3.  The infrastructure (like an ECS Task or a Lambda function) uses its IAM Role to fetch and decrypt the secret at runtime.

### Dynamic References in CloudFormation
CloudFormation natively supports resolving secrets during deployment. If you need to pass a database password to an RDS instance at creation time, you do not pass it via a parameter. You use a dynamic reference:

```yaml
MyRDSInstance:
  Type: AWS::RDS::DBInstance
  Properties:
    Engine: mysql
    MasterUsername: admin
    # CFN resolves this string into the actual DB password during deployment 
    # but does NOT store the plaintext in the stack state.
    MasterUserPassword: '{{resolve:ssm-secure:MyProductionDbPassword:1}}'
```

### Injection into ECS Compute
As seen in Chapter 6, for ECS containers, you map the secret ARN directly into the `Secrets` block of the Task Definition.

**The Workflow:**
1.  The `EcsTaskExecutionRole` requests `arn:aws:secretsmanager:us-east-1:1234567890:secret:DB_PASSWORD`.
2.  AWS IAM verifies the role has `secretsmanager:GetSecretValue`.
3.  AWS KMS verifies the role has `kms:Decrypt` for the key used to encrypt the secret.
4.  The value is decrypted *only in memory* and injected as an environment variable (`DB_PASSWORD`) exactly as the container starts.
5.  The secret string never touches disk and never appears in the CloudFormation Console or plain text.

### Scoped `kms:Decrypt` with `kms:ViaService` Condition

The `kms:Decrypt` permission in the task execution role is now scoped with a `kms:ViaService` condition key. This restricts the role so it can only invoke KMS decryption when the request originates from specific AWS services:

```yaml
- Effect: Allow
  Action: kms:Decrypt
  Resource: !Ref KmsKeyArn
  Condition:
    StringEquals:
      kms:ViaService:
        - !Sub 'secretsmanager.${AWS::Region}.amazonaws.com'
        - !Sub 'ssm.${AWS::Region}.amazonaws.com'
```

Without this condition, a compromised task execution role could call `kms:Decrypt` directly against the KMS key to decrypt arbitrary ciphertext. With `kms:ViaService`, decryption only succeeds when routed through Secrets Manager or SSM Parameter Store, significantly reducing the blast radius of a credential compromise.

## Why `NoEcho` Is Insufficient for Security
CloudFormation Parameters have a property called `NoEcho: true`.
Many beginners think this makes a parameter "secure". **It does not.**

When you set `NoEcho: true`:
1.  It masks the value with `****` in the AWS Console and API responses.
2.  However, the value might still be logged in CloudTrail if the downstream service logs it.
3.  It provides zero capabilities for **Rotation** (automatically changing the password every 30 days).
4.  It provides no access control. Anyone who can run the CloudFormation template can use the credential.

Always prefer a dedicated secrets store over relying solely on `NoEcho`.

---

### Secrets Parameters Exposed in `root.yaml`

All secrets generation parameters are now surfaced in `root.yaml` for full customization:

*   **`PasswordLength`**: Length of the generated password (default varies by engine).
*   **`PasswordExcludeChars`**: Characters to exclude from generation (e.g., `"/@\"'\\`).
*   **`RequireEachCharType`**: Whether the password must include uppercase, lowercase, digits, and symbols (default: `true`).

This avoids hardcoding secret policies deep in nested templates and lets operators adjust password complexity requirements from the root stack at deploy time.

---

## 🎯 God-Level Checklist for Chapter 8
- [ ] **Are all credentials sourced from Secrets Manager or SSM instead of literals?** (Answer: Yes, mapped through dynamic references or ECS `Secrets` blocks).
- [ ] **What two IAM permissions are required for an ECS Task to pull a secret?** (Answer: The Execution Role needs `secretsmanager:GetSecretValue` and, if using a Customer Managed Key, `kms:Decrypt`.)
- [ ] **Is `kms:Decrypt` scoped to only the intended AWS services?** (Answer: Yes. The `kms:ViaService` condition restricts decryption to requests originating from Secrets Manager and SSM Parameter Store only.)
- [ ] **Why is `NoEcho: true` not a complete secrets management strategy?** (Answer: It only obfuscates console display; it lacks rotation policies, granular access controls, and audit logs of who accessed the secret).
