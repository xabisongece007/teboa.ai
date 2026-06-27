import Link from "next/link";
import BlogShell from "./_components/blog-shell";
import { getPublishedPosts } from "./_lib/blog-data";
import styles from "./blog.module.css";

export const revalidate = 3600;

export const metadata = {
  title: "Blog",
  description:
    "TeboaTech articles on Shopify automation, eCommerce operations, customer support systems, and practical growth workflows.",
  alternates: {
    canonical: "https://teboatech.com/blog",
  },
};

export default async function BlogIndexPage() {
  const posts = await getPublishedPosts();

  return (
    <BlogShell
      eyebrow="TeboaTech Blog"
      title="Practical systems for Shopify growth and smoother operations."
      description="Read what we are learning about automation, support workflows, customer retention, and building a cleaner operating system for eCommerce teams."
    >
      <section className={styles.section}>
        <div className={styles.sectionInner}>
          {posts.length === 0 ? (
            <div className={styles.emptyState}>
              No published posts are live yet. As soon as posts are marked published in
              Firestore, they will appear here automatically.
            </div>
          ) : (
            <div className={styles.listGrid}>
              {posts.map((post) => (
                <article key={post.id} className={styles.postCard}>
                  <div className={styles.postMeta}>
                    {post.createdAtLabel || "Published post"}
                  </div>
                  <Link href={`/blog/${post.slug}`} className={styles.postTitle}>
                    {post.title}
                  </Link>
                  <p className={styles.postExcerpt}>{post.excerpt}</p>
                  <Link href={`/blog/${post.slug}`} className={styles.readMore}>
                    Read the full post &rarr;
                  </Link>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>
    </BlogShell>
  );
}
