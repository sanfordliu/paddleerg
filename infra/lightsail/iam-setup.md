# Lightsail IAM setup

AWS does **not** provide a managed `AmazonLightsailFullAccess` policy. Create a
customer-managed policy and attach it to `sredr-cursor-dev`.

## Console

1. **IAM → Policies → Create policy → JSON**, paste:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "LightsailFullAccess",
      "Effect": "Allow",
      "Action": "lightsail:*",
      "Resource": "*"
    }
  ]
}
```

2. Name it `LightsailFullAccessPolicy` and create it.
3. **IAM → Users → `sredr-cursor-dev` → Add permissions → Attach policies directly**
   → select `LightsailFullAccessPolicy`.

## CLI (admin principal)

```bash
aws iam create-policy \
  --policy-name LightsailFullAccessPolicy \
  --policy-document '{
    "Version": "2012-10-17",
    "Statement": [{
      "Sid": "LightsailFullAccess",
      "Effect": "Allow",
      "Action": "lightsail:*",
      "Resource": "*"
    }]
  }'

# Use the PolicyArn from the create-policy response:
aws iam attach-user-policy \
  --user-name sredr-cursor-dev \
  --policy-arn arn:aws:iam::ACCOUNT_ID:policy/LightsailFullAccessPolicy
```

## Verify

```bash
./infra/lightsail/verify-iam.sh
```

You should see the `nano` power listed and an empty (or existing) container services table.
