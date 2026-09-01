# AWS documentation full-text source bundle

**Query:** aws s3api put-bucket-versioning command options

> The sections below are verbatim downloaded AWS documentation, not a synthesized answer. Use each section's source URL when citing or checking freshness.


---

## Source 1: put-bucket-versioning — AWS CLI 1.46.0 Command Reference

- **Search result:** <https://docs.aws.amazon.com/cli/v1/reference/s3control/put-bucket-versioning.html>
- **Retrieved from:** <https://docs.aws.amazon.com/cli/v1/reference/s3control/put-bucket-versioning.html>
- **Stored format:** `html-to-markdown`
- **Cache:** `miss`
- **SHA-256:** `8a545a1549bd3e0955372197053f4f8aac503b46179ecd6ef72fea8876981834`
- **Bytes:** 14848

<div class="aws-document-source">

<div class="navbar navbar-fixed-top">

<div class="navbar-inner">

<div class="container">

<a href="../../index.html" class="brand">AWS CLI Command Reference</a>

- <a href="../../index.html" class="nav-link">Home</a>
- <a href="https://docs.aws.amazon.com/cli/latest/userguide/" class="nav-link">User Guide</a>
- <a href="https://forums.aws.amazon.com/forum.jspa?forumID=150" class="nav-link">Forum</a>
- <a href="https://github.com/aws/aws-cli" class="nav-link">GitHub</a>

<div id="github-stars" class="pull-right">

<div class="iframe">

<span class="github-btn"><a href="#" class="gh-btn" rel="noopener noreferrer" target="_blank"><span class="gh-ico" aria-hidden="true"></span> <span class="gh-text"></span></a> <a href="#" class="gh-count" rel="noopener noreferrer" target="_blank" aria-hidden="true"></a></span>

</div>

</div>

</div>

</div>

</div>

<div class="related" role="navigation" aria-label="related navigation">

### Navigation

- <a href="../../genindex.html" accesskey="I" title="General Index">index</a>
- <a href="put-job-tagging.html" accesskey="N" title="put-job-tagging">next</a> \|
- <a href="put-bucket-tagging.html" accesskey="P" title="put-bucket-tagging">previous</a> \|
- [AWS CLI 1.46.1 Command Reference](../../index.html) »
- [aws](../index.html) »
- <a href="index.html" accesskey="U">s3control</a> »
- [put-bucket-versioning]()

</div>

<div class="container">

<div class="top-links">

- [← put-bucket-tagging](put-bucket-tagging.html "previous chapter (use the left arrow)") <span class="divider">/</span>
- [put-job-tagging →](put-job-tagging.html "next chapter (use the right arrow)")

</div>

<div class="document clearer">

<div class="sphinxsidebar" role="navigation" aria-label="main navigation">

<div class="sphinxsidebarwrapper">

[<img src="../../_static/logo.png" class="logo" height="63" alt="Amazon Web Services logo" />](../../index.html)

<div>

### [Table of Contents](../../index.html)

- <a href="#" class="reference internal">put-bucket-versioning</a>
  - <a href="#description" class="reference internal">Description</a>
  - <a href="#synopsis" class="reference internal">Synopsis</a>
  - <a href="#options" class="reference internal">Options</a>
  - <a href="#global-options" class="reference internal">Global Options</a>
  - <a href="#output" class="reference internal">Output</a>

</div>

<div id="searchbox" style="display: none">

### Quick search

Search box

Search

</div>

<div class="left-bar-other">

### Feedback

Did you find this page useful? Do you have a suggestion to improve the documentation? [Give us feedback](https://docs.aws.amazon.com/forms/aws-doc-feedback?hidden_service_name=AWS%20Command%20Line%20Interface&hidden_guide_name=Reference&topic_url=https%3A%2F%2Fdocs.aws.amazon.com%2Fcli%2Flatest%2Freference/s3control/put-bucket-versioning.html).\
If you would like to suggest an improvement or fix for the AWS CLI, check out our [contributing guide](https://github.com/aws/aws-cli/blob/develop/CONTRIBUTING.md) on GitHub.

</div>

<div class="left-bar-other">

### User Guide

First time using the AWS CLI? See the [User Guide](https://docs.aws.amazon.com/cli/latest/userguide/) for help getting started.

</div>

</div>

</div>

<div class="body">

<div class="well">

### Note:

You are viewing the documentation for an older major version of the AWS CLI (version 1). To view this page for the AWS CLI version 2, click [here](https://docs.aws.amazon.com/cli/latest/reference/s3control/put-bucket-versioning.html).

AWS CLI v1 entered maintenance mode on August 5, 2026 and will reach end-of-support on July 15, 2027. During maintenance mode, releases are limited to critical bug fixes and security issues. AWS CLI v1 will not receive API updates for new or existing services, or be updated to support new regions. For more information, see the [maintenance mode announcement](https://aws.amazon.com/blogs/developer/cli-v1-maintenance-mode-announcement/).

We recommend that you migrate to AWS CLI version 2. See the [installation instructions](https://docs.aws.amazon.com/cli/latest/userguide/install-cliv2.html) and [migration guide](https://docs.aws.amazon.com/cli/latest/userguide/cliv2-migration.html).

</div>

\[ <a href="../index.html#cli-aws" class="reference internal"><span class="std std-ref">aws</span></a> . <a href="index.html#cli-aws-s3control" class="reference internal"><span class="std std-ref">s3control</span></a> \]

<div id="put-bucket-versioning" class="section">

<span id="cli-aws-s3control-put-bucket-versioning"></span>

# put-bucket-versioning<a href="#put-bucket-versioning" class="headerlink" title="Permalink to this heading">¶</a>

<div id="description" class="section">

## Description<a href="#description" class="headerlink" title="Permalink to this heading">¶</a>

<div class="admonition note">

### Note

This operation sets the versioning state for S3 on Outposts buckets only. To set the versioning state for an S3 bucket, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/API/API_PutBucketVersioning.html" class="reference external">PutBucketVersioning</a> in the *Amazon S3 API Reference* .

</div>

Sets the versioning state for an S3 on Outposts bucket. With S3 Versioning, you can save multiple distinct copies of your objects and recover from unintended user actions and application failures.

You can set the versioning state to one of the following:

- **Enabled** - Enables versioning for the objects in the bucket. All objects added to the bucket receive a unique version ID.
- **Suspended** - Suspends versioning for the objects in the bucket. All objects added to the bucket receive the version ID <span class="pre">`null`</span> .

If you’ve never set versioning on your bucket, it has no versioning state. In that case, a <a href="https://docs.aws.amazon.com/AmazonS3/latest/API/API_control_GetBucketVersioning.html" class="reference external">GetBucketVersioning</a> request does not return a versioning state value.

When you enable S3 Versioning, for each object in your bucket, you have a current version and zero or more noncurrent versions. You can configure your bucket S3 Lifecycle rules to expire noncurrent versions after a specified time period. For more information, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/userguide/S3OutpostsLifecycleManaging.html" class="reference external">Creating and managing a lifecycle configuration for your S3 on Outposts bucket</a> in the *Amazon S3 User Guide* .

If you have an object expiration lifecycle configuration in your non-versioned bucket and you want to maintain the same permanent delete behavior when you enable versioning, you must add a noncurrent expiration policy. The noncurrent expiration lifecycle configuration will manage the deletes of the noncurrent object versions in the version-enabled bucket. For more information, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/userguide/Versioning.html" class="reference external">Versioning</a> in the *Amazon S3 User Guide* .

All Amazon S3 on Outposts REST API requests for this action require an additional parameter of <span class="pre">`x-amz-outpost-id`</span> to be passed with the request. In addition, you must use an S3 on Outposts endpoint hostname prefix instead of <span class="pre">`s3-control`</span> . For an example of the request syntax for Amazon S3 on Outposts that uses the S3 on Outposts endpoint hostname prefix and the <span class="pre">`x-amz-outpost-id`</span> derived by using the access point ARN, see the <a href="https://docs.aws.amazon.com/AmazonS3/latest/API/API_control_PutBucketVersioning.html#API_control_PutBucketVersioning_Examples" class="reference external">Examples</a> section.

The following operations are related to <span class="pre">`PutBucketVersioning`</span> for S3 on Outposts.

- <a href="https://docs.aws.amazon.com/AmazonS3/latest/API/API_control_GetBucketVersioning.html" class="reference external">GetBucketVersioning</a>
- <a href="https://docs.aws.amazon.com/AmazonS3/latest/API/API_control_PutBucketLifecycleConfiguration.html" class="reference external">PutBucketLifecycleConfiguration</a>
- <a href="https://docs.aws.amazon.com/AmazonS3/latest/API/API_control_GetBucketLifecycleConfiguration.html" class="reference external">GetBucketLifecycleConfiguration</a>

See also: <a href="https://docs.aws.amazon.com/goto/WebAPI/s3control-2018-08-20/PutBucketVersioning" class="reference external">AWS API Documentation</a>

</div>

<div id="synopsis" class="section">

## Synopsis<a href="#synopsis" class="headerlink" title="Permalink to this heading">¶</a>

<div class="highlight-default notranslate">

<div class="highlight">

      put-bucket-versioning
    --account-id <value>
    --bucket <value>
    [--mfa <value>]
    --versioning-configuration <value>
    [--cli-input-json <value>]
    [--generate-cli-skeleton <value>]
    [--debug]
    [--endpoint-url <value>]
    [--no-verify-ssl]
    [--no-paginate]
    [--output <value>]
    [--query <value>]
    [--profile <value>]
    [--region <value>]
    [--version <value>]
    [--color <value>]
    [--no-sign-request]
    [--ca-bundle <value>]
    [--cli-read-timeout <value>]
    [--cli-connect-timeout <value>]
    [--v2-debug]

</div>

</div>

</div>

<div id="options" class="section">

## Options<a href="#options" class="headerlink" title="Permalink to this heading">¶</a>

<span class="pre">`--account-id`</span> (string)

> <div>
>
> The Amazon Web Services account ID of the S3 on Outposts bucket.
>
> </div>

<span class="pre">`--bucket`</span> (string)

> <div>
>
> The S3 on Outposts bucket to set the versioning state for.
>
> </div>

<span class="pre">`--mfa`</span> (string)

> <div>
>
> The concatenation of the authentication device’s serial number, a space, and the value that is displayed on your authentication device.
>
> </div>

<span class="pre">`--versioning-configuration`</span> (structure)

> <div>
>
> The root-level tag for the <span class="pre">`VersioningConfiguration`</span> parameters.
>
> MFADelete -\> (string)
>
> > <div>
> >
> > Specifies whether MFA delete is enabled or disabled in the bucket versioning configuration for the S3 on Outposts bucket.
> >
> > </div>
>
> Status -\> (string)
>
> > <div>
> >
> > Sets the versioning state of the S3 on Outposts bucket.
> >
> > </div>
>
> </div>

Shorthand Syntax:

<div class="highlight-default notranslate">

<div class="highlight">

    MFADelete=string,Status=string

</div>

</div>

JSON Syntax:

<div class="highlight-default notranslate">

<div class="highlight">

    {
      "MFADelete": "Enabled"|"Disabled",
      "Status": "Enabled"|"Suspended"
    }

</div>

</div>

<span class="pre">`--cli-input-json`</span> (string) Performs service operation based on the JSON string provided. The JSON string follows the format provided by <span class="pre">`--generate-cli-skeleton`</span>. If other arguments are provided on the command line, the CLI values will override the JSON-provided values. It is not possible to pass arbitrary binary values using a JSON-provided value as the string will be taken literally.

<span class="pre">`--generate-cli-skeleton`</span> (string) Prints a JSON skeleton to standard output without sending an API request. If provided with no value or the value <span class="pre">`input`</span>, prints a sample input JSON that can be used as an argument for <span class="pre">`--cli-input-json`</span>. If provided with the value <span class="pre">`output`</span>, it validates the command inputs and returns a sample output JSON for that command.

</div>

<div id="global-options" class="section">

## Global Options<a href="#global-options" class="headerlink" title="Permalink to this heading">¶</a>

<span class="pre">`--debug`</span> (boolean)

Turn on debug logging.

<span class="pre">`--endpoint-url`</span> (string)

Override command’s default URL with the given URL.

<span class="pre">`--no-verify-ssl`</span> (boolean)

By default, the AWS CLI uses SSL when communicating with AWS services. For each SSL connection, the AWS CLI will verify SSL certificates. This option overrides the default behavior of verifying SSL certificates.

<span class="pre">`--no-paginate`</span> (boolean)

Disable automatic pagination. If automatic pagination is disabled, the AWS CLI will only make one call, for the first page of results.

<span class="pre">`--output`</span> (string)

The formatting style for command output.

- json
- text
- table

<span class="pre">`--query`</span> (string)

A JMESPath query to use in filtering the response data.

<span class="pre">`--profile`</span> (string)

Use a specific profile from your credential file.

<span class="pre">`--region`</span> (string)

The region to use. Overrides config/env settings.

<span class="pre">`--version`</span> (string)

Display the version of this tool.

<span class="pre">`--color`</span> (string)

Turn on/off color output.

- on
- off
- auto

<span class="pre">`--no-sign-request`</span> (boolean)

Do not sign requests. Credentials will not be loaded if this argument is provided.

<span class="pre">`--ca-bundle`</span> (string)

The CA certificate bundle to use when verifying SSL certificates. Overrides config/env settings.

<span class="pre">`--cli-read-timeout`</span> (int)

The maximum socket read time in seconds. If the value is set to 0, the socket read will be blocking and not timeout. The default value is 60 seconds.

<span class="pre">`--cli-connect-timeout`</span> (int)

The maximum socket connect time in seconds. If the value is set to 0, the socket connect will be blocking and not timeout. The default value is 60 seconds.

<span class="pre">`--v2-debug`</span> (boolean)

Enable AWS CLI v2 migration assistance. Prints warnings if the command would face a breaking change after swapping AWS CLI v1 for AWS CLI v2 in the current environment. Prints one warning for each breaking change detected.

</div>

<div id="output" class="section">

## Output<a href="#output" class="headerlink" title="Permalink to this heading">¶</a>

None

</div>

</div>

</div>

<div class="clearfix">

</div>

</div>

<div class="footer-links">

- [← put-bucket-tagging](put-bucket-tagging.html "previous chapter (use the left arrow)") <span class="divider">/</span>
- [put-job-tagging →](put-job-tagging.html "next chapter (use the right arrow)")

</div>

</div>

<div class="related" role="navigation" aria-label="related navigation">

### Navigation

- [index](../../genindex.html "General Index")
- [next](put-job-tagging.html "put-job-tagging") \|
- [previous](put-bucket-tagging.html "put-bucket-tagging") \|
- [AWS CLI 1.46.1 Command Reference](../../index.html) »
- [aws](../index.html) »
- [s3control](index.html) »
- [put-bucket-versioning]()

</div>

<div id="awsdocs-legal-zone-copyright" class="footer container">

</div>


</div>
