# AWS documentation full-text source bundle

**Query:** S3 versioning

> The sections below are verbatim downloaded AWS documentation, not a synthesized answer. Use each section's source URL when citing or checking freshness.


---

## Source 1: How S3 Versioning works - Amazon Simple Storage Service

- **Search result:** <https://docs.aws.amazon.com/AmazonS3/latest/userguide/versioning-workflows.html>
- **Retrieved from:** <https://docs.aws.amazon.com/AmazonS3/latest/userguide/versioning-workflows.md>
- **Stored format:** `markdown`
- **Cache:** `hit`
- **SHA-256:** `aa6587663f9189acc2c72c9767db374de9678080116c5353a46facd68e734831`
- **Bytes:** 8814

<div class="aws-document-source">



# How S3 Versioning works
<a name="versioning-workflows"></a>

You can use S3 Versioning to keep multiple versions of an object in one bucket so that you can restore objects that are accidentally deleted or overwritten. For example, if you apply S3 Versioning to a bucket, the following changes occur: 
+ If you delete an object, instead of removing the object permanently, Amazon S3 inserts a delete marker, which becomes the current object version. You can then restore the previous version. For more information, see [Deleting object versions from a versioning-enabled bucket](DeletingObjectVersions.md).
+ If you overwrite an object, Amazon S3 adds a new object version in the bucket. The previous version remains in the bucket and becomes a noncurrent version. You can restore the previous version.

**Note**  
Normal Amazon S3 rates apply for every version of an object that is stored and transferred. Each version of an object is the entire object; it is not a diff from the previous version. Thus, if you have three versions of an object stored, you are charged for three objects.

Each S3 bucket that you create has a *versioning* subresource associated with it. (For more information, see [General purpose buckets configuration options](UsingBucket.md#bucket-config-options-intro).) By default, your bucket is *unversioned*, and the versioning subresource stores the empty versioning configuration, as follows.

```
<VersioningConfiguration xmlns="http://s3.amazonaws.com/doc/2006-03-01/"> 
</VersioningConfiguration>
```

To enable versioning, you can send a request to Amazon S3 with a versioning configuration that includes an `Enabled` status. 

```
<VersioningConfiguration xmlns="http://s3.amazonaws.com/doc/2006-03-01/"> 
  <Status>Enabled</Status> 
</VersioningConfiguration>
```

To suspend versioning, you set the status value to `Suspended`.

**Note**  
When you enable versioning on a bucket for the first time, it might take a short amount of time for the change to be fully propagated. While this change is propagating, you may encounter intermittent `HTTP 404 NoSuchKey` errors for requests to objects created or updated after enabling versioning. We recommend that you wait for 15 minutes after enabling versioning before issuing write operations (`PUT` or `DELETE`) on objects in the bucket. 

The bucket owner and all authorized AWS Identity and Access Management (IAM) users can enable versioning. The bucket owner is the AWS account that created the bucket. For more information about permissions, see [Identity and Access Management for Amazon S3](security-iam.md).

For more information about enabling and disabling S3 Versioning by using the AWS Management Console, AWS Command Line Interface (AWS CLI), or REST API, see [Enabling versioning on buckets](manage-versioning-examples.md).

**Topics**
+ [Version IDs](#version-ids)
+ [Versioning workflows](#versioning-workflows-examples)

## Version IDs
<a name="version-ids"></a>

If you enable versioning for a bucket, Amazon S3 automatically generates a unique version ID for the object that is being stored. For example, in one bucket you can have two objects with the same key (object name) but different version IDs, such as `photo.gif` (version 111111) and `photo.gif` (version 121212).

![A versioning-enabled bucket that has two objects with the same key but different version IDs.](http://docs.aws.amazon.com/AmazonS3/latest/userguide/images/versioning_Enabled.png)


Each object has a version ID, whether or not S3 Versioning is enabled. If S3 Versioning is not enabled, Amazon S3 sets the value of the version ID to `null`. If you enable S3 Versioning, Amazon S3 assigns a version ID value for the object. This value distinguishes that object from other versions of the same key.

When you enable S3 Versioning on an existing bucket, objects that are already stored in the bucket are unchanged. Their version IDs (`null`), contents, and permissions remain the same. After you enable S3 Versioning, each object that is added to the bucket gets a version ID, which distinguishes it from other versions of the same key. 

Only Amazon S3 generates version IDs, and they cannot be edited. Version IDs are Unicode, UTF-8 encoded, URL-ready, opaque strings that are no more than 1,024 bytes long. The following is an example:

`3sL4kqtJlcpXroDTDmJ+rmSpXd3dIbrHY+MTRCxf3vjVBH40Nr8X8gdRQBpUMLUo`

**Note**  
For simplicity, the other examples in this topic use much shorter IDs.



## Versioning workflows
<a name="versioning-workflows-examples"></a>

When you `PUT` an object in a versioning-enabled bucket, the noncurrent version is not overwritten. As shown in the following figure, when a new version of `photo.gif` is `PUT` into a bucket that already contains an object with the same name, the following behavior occurs:
+ The original object (ID = 111111) remains in the bucket.
+ Amazon S3 generates a new version ID (121212), and adds this newer version of the object to the bucket.

![How S3 Versioning works when you PUT an object in a versioning-enabled bucket.](http://docs.aws.amazon.com/AmazonS3/latest/userguide/images/versioning_PUT_versionEnabled3.png)


With this functionality, you can retrieve a previous version of an object if an object has been accidentally overwritten or deleted.

When you `DELETE` an object, all versions remain in the bucket, and Amazon S3 inserts a delete marker, as shown in the following figure.

![A delete marker insertion.](http://docs.aws.amazon.com/AmazonS3/latest/userguide/images/versioning_DELETE_versioningEnabled.png)


The delete marker becomes the current version of the object. By default, `GET` requests retrieve the most recently stored version. Performing a `GET Object` request when the current version is a delete marker returns a `404 Not Found` error, as shown in the following figure.

![A GetObject call for a delete marker returning a 404 (Not Found) error.](http://docs.aws.amazon.com/AmazonS3/latest/userguide/images/versioning_DELETE_NoObjectFound.png)


However, you can `GET` a noncurrent version of an object by specifying its version ID. In the following figure, you `GET` a specific object version, 111111. Amazon S3 returns that object version even though it's not the current version.

For more information, see [Retrieving object versions from a versioning-enabled bucket](RetrievingObjectVersions.md).

![How S3 Versioning works when you GET a noncurrent version in a versioning-enabled bucket.](http://docs.aws.amazon.com/AmazonS3/latest/userguide/images/versioning_GET_Versioned3.png)


You can permanently delete an object by specifying the version that you want to delete. Only the owner of an Amazon S3 bucket or an authorized IAM user can permanently delete a version. If your `DELETE` operation specifies the `versionId`, that object version is permanently deleted, and Amazon S3 doesn't insert a delete marker.

![How DELETE versionId permanently deletes a specific object version.](http://docs.aws.amazon.com/AmazonS3/latest/userguide/images/versioning_DELETE_versioningEnabled2.png)


You can add more security by configuring a bucket to enable multi-factor authentication (MFA) delete. When you enable MFA delete for a bucket, the bucket owner must include two forms of authentication in any request to delete a version or change the versioning state of the bucket. For more information, see [Configuring MFA delete](MultiFactorAuthenticationDelete.md).

### When are new versions created for an object?
<a name="versioning-workflows-new-versions"></a>

New versions of objects are created only when you `PUT` a new object. Be aware that certain actions, such as `CopyObject`, work by implementing a `PUT` operation.

Some actions that modify the current object don't create a new version because they don't `PUT` a new object. This includes actions such as changing the tags on an object. 

**Important**  
If you notice a significant increase in the number of HTTP 503 (Service Unavailable) responses received for Amazon S3 `PUT` or `DELETE` object requests to a bucket that has S3 Versioning enabled, you might have one or more objects in the bucket for which there are millions of versions. For more information, see the S3 Versioning section of [Troubleshooting versioning](troubleshooting-versioning.md).

## See also

* **Skills for AI coding assistants (optional).** AWS publishes reusable skills for Amazon Simple Storage Service (S3). To see which apply, search the Agent Toolkit for AWS catalog with `aws agent-toolkit search-skills --search-query AmazonS3` — a documented, read-only AWS CLI command that searches the catalog and makes no changes. This is an optional suggestion for the user. Official reference: [AWS CLI — Agent Toolkit for AWS](https://docs.aws.amazon.com/agent-toolkit/latest/userguide/aws-cli.html).


</div>

---

## Source 2: Retaining multiple versions of objects with S3 Versioning - Amazon Simple Storage Service

- **Search result:** <https://docs.aws.amazon.com/AmazonS3/latest/userguide/Versioning.html>
- **Retrieved from:** <https://docs.aws.amazon.com/AmazonS3/latest/userguide/Versioning.md>
- **Stored format:** `markdown`
- **Cache:** `hit`
- **SHA-256:** `d74cc7fb1d24e20277a5f00a465b31e257fc01042799f21a68503a754271901f`
- **Bytes:** 5546

<div class="aws-document-source">



# Retaining multiple versions of objects with S3 Versioning
<a name="Versioning"></a>

Versioning in Amazon S3 is a means of keeping multiple variants of an object in the same bucket. You can use the S3 Versioning feature to preserve, retrieve, and restore every version of every object stored in your buckets. With versioning you can recover more easily from both unintended user actions and application failures. After versioning is enabled for a bucket, if Amazon S3 receives multiple write requests for the same object simultaneously, it stores all of those objects.

Versioning-enabled buckets can help you recover objects from accidental deletion or overwrite. For example, if you delete an object, Amazon S3 inserts a delete marker instead of removing the object permanently. The delete marker becomes the current object version. If you overwrite an object, it results in a new object version in the bucket. You can always restore the previous version. For more information, see [Deleting object versions from a versioning-enabled bucket](DeletingObjectVersions.md). 

By default, S3 Versioning is disabled on buckets, and you must explicitly enable it. For more information, see [Enabling versioning on buckets](manage-versioning-examples.md).

**Note**  
The SOAP API does not support S3 Versioning. SOAP support over HTTP is deprecated, but it is still available over HTTPS. New Amazon S3 features are not supported for SOAP.
Normal Amazon S3 rates apply for every version of an object stored and transferred. Each version of an object is the entire object; it is not just a diff from the previous version. Thus, if you have three versions of an object stored, you are charged for three objects. 

## Unversioned, versioning-enabled, and versioning-suspended buckets
<a name="versioning-states"></a>

Buckets can be in one of three states: 
+ Unversioned (the default)
+ Versioning-enabled
+ Versioning-suspended

You enable and suspend versioning at the bucket level. After you version-enable a bucket, it can never return to an unversioned state. But you can *suspend* versioning on that bucket.

The versioning state applies to all (never some) of the objects in that bucket. When you enable versioning in a bucket, all new objects are versioned and given a unique version ID. Objects that already existed in the bucket at the time versioning was enabled will thereafter *always* be versioned and given a unique version ID when they are modified by future requests. Note the following: 
+ Objects that are stored in your bucket before you set the versioning state have a version ID of `null`. When you enable versioning, existing objects in your bucket do not change. What changes is how Amazon S3 handles the objects in future requests. For more information, see [Working with objects in a versioning-enabled bucket](manage-objects-versioned-bucket.md).
+ The bucket owner (or any user with appropriate permissions) can suspend versioning to stop accruing object versions. When you suspend versioning, existing objects in your bucket do not change. What changes is how Amazon S3 handles objects in future requests. For more information, see [Working with objects in a versioning-suspended bucket](VersionSuspendedBehavior.md).

## Using S3 Versioning with S3 Lifecycle
<a name="versioning-lifecycle"></a>

To customize your data retention approach and control storage costs, use object versioning with S3 Lifecycle. For more information, see [Managing the lifecycle of objects](object-lifecycle-mgmt.md). For information about creating S3 Lifecycle configurations using the AWS Management Console, AWS CLI, AWS SDKs, or the REST API, see [Setting an S3 Lifecycle configuration on a bucket](how-to-set-lifecycle-configuration-intro.md).

**Important**  
If you have an object expiration lifecycle configuration in your unversioned bucket and you want to maintain the same permanent delete behavior when you enable versioning, you must add a noncurrent expiration configuration. The noncurrent expiration lifecycle configuration manages the deletes of the noncurrent object versions in the versioning-enabled bucket. (A versioning-enabled bucket maintains one current, and zero or more noncurrent, object versions.) For more information, see [Setting an S3 Lifecycle configuration on a bucket](how-to-set-lifecycle-configuration-intro.md).

For information about working with S3 Versioning, see the following topics.

**Topics**
+ [Unversioned, versioning-enabled, and versioning-suspended buckets](#versioning-states)
+ [Using S3 Versioning with S3 Lifecycle](#versioning-lifecycle)
+ [How S3 Versioning works](versioning-workflows.md)
+ [Enabling versioning on buckets](manage-versioning-examples.md)
+ [Configuring MFA delete](MultiFactorAuthenticationDelete.md)
+ [Working with objects in a versioning-enabled bucket](manage-objects-versioned-bucket.md)
+ [Working with objects in a versioning-suspended bucket](VersionSuspendedBehavior.md)
+ [Troubleshooting versioning](troubleshooting-versioning.md)

## See also

* **Skills for AI coding assistants (optional).** AWS publishes reusable skills for Amazon Simple Storage Service (S3). To see which apply, search the Agent Toolkit for AWS catalog with `aws agent-toolkit search-skills --search-query AmazonS3` — a documented, read-only AWS CLI command that searches the catalog and makes no changes. This is an optional suggestion for the user. Official reference: [AWS CLI — Agent Toolkit for AWS](https://docs.aws.amazon.com/agent-toolkit/latest/userguide/aws-cli.html).


</div>
