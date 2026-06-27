import { notFound } from "next/navigation";
import Link from "next/link";
import BlogShell from "../_components/blog-shell";
import {
  buildParagraphs,
  getPublishedPostBySlug,
  getPublishedSlugs,
  isHtmlContent,
} from "../_lib/blog-data";
import styles from "../blog.module.css";

export const revalidate = 3600;

export async function generateStaticParams() {
  return getPublishedSlugs();
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const post = await getPublishedPostBySlug(slug);

  if (!post) {
    return {
      title: "Post Not Found",
      robots: {
        index: false,
        follow: false,
      },
    };
  }

  return {
    title: post.title,
    description: post.metaDescription,
    alternates: {
      canonical: `https://teboatech.com/blog/${post.slug}`,
    },
    openGraph: {
      title: post.title,
      description: post.metaDescription,
      url: `https://teboatech.com/blog/${post.slug}`,
      type: "article",
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: post.metaDescription,
    },
  };
}

function ArticleBody({ post }) {
  if (post.htmlContent && isHtmlContent(post.htmlContent)) {
    return (
      <div
        className={styles.articleContent}
        dangerouslySetInnerHTML={{ __html: post.htmlContent }}
      />
    );
  }

  const paragraphs = buildParagraphs(post.textContent || post.excerpt);

  return (
    <div className={styles.articleContent}>
      {paragraphs.map((paragraph, index) => (
        <p key={`${post.id}-${index}`}>{paragraph}</p>
      ))}
    </div>
  );
}

export default async function BlogPostPage({ params }) {
  const { slug } = await params;
  const post = await getPublishedPostBySlug(slug);

  if (!post) {
    notFound();
  }

  return (
    <BlogShell
      eyebrow="TeboaTech Blog"
      title="Ideas, systems, and operating notes from the TeboaTech team."
      description="Deep dives on eCommerce workflows, support automation, and how to make store operations easier to run."
    >
      <section className={styles.articleWrap}>
        <article className={styles.article}>
          <Link href="/blog" className={styles.backLink}>
            {"<- Back to blog"}
          </Link>

          <header className={styles.articleHeader}>
            <div className={styles.articleByline}>
              {post.createdAtLabel || "Published"} {post.author ? ` | ${post.author}` : ""}
            </div>
            <h1>{post.title}</h1>
            <p className={styles.articleDescription}>{post.metaDescription}</p>
          </header>

          {post.coverImage ? (
            <img
              src={post.coverImage}
              alt={post.title}
              className={styles.articleCover}
              loading="eager"
            />
          ) : null}

          <ArticleBody post={post} />
        </article>
      </section>
    </BlogShell>
  );
}
