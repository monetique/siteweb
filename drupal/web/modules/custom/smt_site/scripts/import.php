<?php

/**
 * @file
 * Import du contenu du site (mêmes données que l'ancien Strapi : cms/data/seed*.json).
 *
 *   vendor/bin/drush php:script web/modules/custom/smt_site/scripts/import.php            -> importe si vide
 *   vendor/bin/drush php:script web/modules/custom/smt_site/scripts/import.php -- --reset -> remplace le contenu
 *
 * Les messages de contact ne sont jamais touchés.
 */

use Drupal\Component\Utility\Html;
use Drupal\file\Entity\File;
use Drupal\node\Entity\Node;
use Drupal\paragraphs\Entity\Paragraph;
use Drupal\smt_site\ModelBuilder;

$reset = in_array('--reset', $extra ?? [], TRUE);
$dir = getenv('SMT_SEED_DIR') ?: DRUPAL_ROOT . '/../../cms/data';
if (!is_file("$dir/seed.json")) {
  throw new \RuntimeException("Données introuvables : $dir/seed.json (définir SMT_SEED_DIR)");
}
$seed = json_decode(file_get_contents("$dir/seed.json"), TRUE);
$tr = [];
foreach (['en', 'ar'] as $l) {
  if (is_file("$dir/seed.$l.json")) {
    $tr[$l] = json_decode(file_get_contents("$dir/seed.$l.json"), TRUE);
  }
}
$model = ModelBuilder::model();
// Clé du fichier de données pour chaque type de contenu.
$keys = ['global' => 'global', 'navigation' => 'navigation', 'dirigeant' => 'dirigeants', 'indicateur' => 'indicateurs',
  'solution' => 'solutions', 'innovation' => 'innovations', 'partenaire' => 'partenaires', 'faq' => 'faqs',
  'actualite' => 'actualites', 'appel_offres' => 'appelsOffres', 'page' => 'pages'];

/** Texte riche Strapi (blocs JSON) -> HTML simple (format « HTML de base »). */
function smt_blocks_html($v): string {
  if (is_string($v)) {
    return $v;
  }
  if (!is_array($v)) {
    return '';
  }
  $inline = function (array $nodes) use (&$inline): string {
    $out = '';
    foreach ($nodes as $n) {
      if (($n['type'] ?? '') === 'link') {
        $out .= '<a href="' . Html::escape($n['url'] ?? '') . '">' . $inline($n['children'] ?? []) . '</a>';
        continue;
      }
      $t = nl2br(Html::escape($n['text'] ?? ''), FALSE);
      foreach (['code' => 'code', 'underline' => 'u', 'italic' => 'em', 'bold' => 'strong'] as $k => $tag) {
        if (!empty($n[$k])) {
          $t = "<$tag>$t</$tag>";
        }
      }
      $out .= $t;
    }
    return $out;
  };
  $html = '';
  foreach ($v as $b) {
    switch ($b['type'] ?? '') {
      case 'heading':
        $l = max(2, min(6, (int) ($b['level'] ?? 2)));
        $html .= "<h$l>" . $inline($b['children'] ?? []) . "</h$l>";
        break;

      case 'list':
        $tag = ($b['format'] ?? '') === 'ordered' ? 'ol' : 'ul';
        $html .= "<$tag>";
        foreach ($b['children'] ?? [] as $li) {
          $html .= '<li>' . $inline($li['children'] ?? []) . '</li>';
        }
        $html .= "</$tag>";
        break;

      case 'quote':
        $html .= '<blockquote>' . $inline($b['children'] ?? []) . '</blockquote>';
        break;

      case 'code':
        $html .= '<pre><code>' . $inline($b['children'] ?? []) . '</code></pre>';
        break;

      default:
        $html .= '<p>' . $inline($b['children'] ?? []) . '</p>';
    }
  }
  return $html;
}

/** Fichier de cms/data/media -> entité fichier Drupal (réutilisée si déjà importée). */
function smt_file(string $dir, string $name, string $sub = 'images'): ?File {
  $src = "$dir/media/$name";
  if (!is_file($src)) {
    return NULL;
  }
  $uri = "public://$sub/$name";
  $existing = \Drupal::entityTypeManager()->getStorage('file')->loadByProperties(['uri' => $uri]);
  if ($existing) {
    return reset($existing);
  }
  $fs = \Drupal::service('file_system');
  $d = "public://$sub";
  $fs->prepareDirectory($d, 1 | 2);
  $fs->copy($src, $uri, 1);
  $file = File::create(['uri' => $uri, 'filename' => $name, 'status' => 1, 'uid' => 1]);
  $file->save();
  return $file;
}

/** Valeurs Drupal d'un élément Strapi (hors titre). $translatable_only : pour une traduction. */
function smt_values(array $def, array $item, string $dir, bool $translatable_only = FALSE): array {
  $values = [];
  foreach ($def['fields'] as $f) {
    $k = $f['strapi'];
    if ($translatable_only && empty($f['translatable'])) {
      continue;
    }
    if ($f['type'] === 'paragraphs') {
      continue;
    }
    if ($f['type'] === 'image' && $k === 'image' && !empty($item['imageFile'])) {
      if ($file = smt_file($dir, $item['imageFile'])) {
        $values[$f['name']] = ['target_id' => $file->id(), 'alt' => $item['imageAlt'] ?? ''];
      }
      continue;
    }
    if ($f['type'] === 'file' && $k === 'video' && !empty($item['videoFile'])) {
      if ($file = smt_file($dir, $item['videoFile'], 'videos')) {
        $values[$f['name']] = ['target_id' => $file->id()];
      }
      continue;
    }
    if (!array_key_exists($k, $item) || $item[$k] === NULL || $item[$k] === '' || $item[$k] === []) {
      continue;
    }
    $v = $item[$k];
    switch ($f['type']) {
      case 'text_long':
        $values[$f['name']] = ['value' => smt_blocks_html($v), 'format' => 'basic_html'];
        break;

      case 'date':
        $values[$f['name']] = substr((string) $v, 0, 10);
        break;

      case 'datetime':
        $values[$f['name']] = gmdate('Y-m-d\TH:i:s', strtotime((string) $v));
        break;

      case 'boolean':
        $values[$f['name']] = $v ? 1 : 0;
        break;

      case 'image':
      case 'file':
        break;

      default:
        $values[$f['name']] = $v;
    }
  }
  return $values;
}

/** Crée les paragraphes d'un élément (récursif). */
function smt_paragraphs(array $model, array $def, array $item, string $dir): array {
  $values = [];
  foreach ($def['fields'] as $f) {
    if ($f['type'] !== 'paragraphs' || empty($item[$f['strapi']])) {
      continue;
    }
    $list = $f['multiple'] ? $item[$f['strapi']] : [$item[$f['strapi']]];
    $refs = [];
    foreach ($list as $child) {
      $bundle = isset($child['__component']) ? str_replace('-', '_', explode('.', $child['__component'], 2)[1]) : $f['targets'][0];
      $pdef = $model['paragraph'][$bundle];
      $p = Paragraph::create(['type' => $bundle, 'langcode' => 'fr'] + smt_values($pdef, $child, $dir) + smt_paragraphs($model, $pdef, $child, $dir));
      $p->save();
      $refs[] = ['target_id' => $p->id(), 'target_revision_id' => $p->getRevisionId()];
    }
    $values[$f['name']] = $refs;
  }
  return $values;
}

/** Ajoute la traduction $lang aux paragraphes d'une entité, en suivant la même structure. */
function smt_translate_paragraphs(array $model, $entity, array $def, array $item, string $lang, string $dir): void {
  foreach ($def['fields'] as $f) {
    if ($f['type'] !== 'paragraphs' || empty($item[$f['strapi']]) || !$entity->hasField($f['name'])) {
      continue;
    }
    $list = $f['multiple'] ? $item[$f['strapi']] : [$item[$f['strapi']]];
    foreach ($entity->get($f['name'])->referencedEntities() as $i => $p) {
      if (!isset($list[$i])) {
        continue;
      }
      $pdef = $model['paragraph'][$p->bundle()];
      $vals = smt_values($pdef, $list[$i], $dir, TRUE);
      $t = $p->hasTranslation($lang) ? $p->getTranslation($lang) : $p->addTranslation($lang);
      foreach ($vals as $k => $v) {
        $t->set($k, $v);
      }
      $t->setNewRevision(FALSE);
      $t->save();
      smt_translate_paragraphs($model, $p, $pdef, $list[$i], $lang, $dir);
    }
  }
}

$storage = \Drupal::entityTypeManager()->getStorage('node');
$moderated = array_diff(array_keys($model['node']), ModelBuilder::NOT_MODERATED);
foreach ($keys as $bundle => $key) {
  $def = $model['node'][$bundle];
  $existing = $storage->getQuery()->accessCheck(FALSE)->condition('type', $bundle)->execute();
  if ($existing && !$reset) {
    echo "  $bundle : déjà rempli, ignoré (--reset pour remplacer)\n";
    continue;
  }
  if ($existing) {
    $storage->delete($storage->loadMultiple($existing));
  }
  $items = $def['single'] ? [$seed[$key]] : ($seed[$key] ?? []);
  $n = $t = 0;
  foreach ($items as $i => $item) {
    if ($bundle === 'global') {
      $item['logo'] = $item['logo'] ?? NULL;
    }
    $title = $def['titleField'] ? ($item[$def['titleField']] ?? $def['label']) : $def['label'];
    $values = ['type' => $bundle, 'langcode' => 'fr', 'uid' => 1, 'status' => 1, 'title' => mb_substr((string) $title, 0, 255)]
      + smt_values($def, $item, $dir) + smt_paragraphs($model, $def, $item, $dir);
    if ($bundle === 'global') {
      if ($logo = smt_file($dir, 'logo-monetique-tunisie.png')) {
        $values['global_logo'] = ['target_id' => $logo->id(), 'alt' => 'Logo Monétique Tunisie'];
      }
      if ($fav = smt_file($dir, 'favicon-monetique-tunisie.png', 'documents')) {
        $values['global_favicon'] = ['target_id' => $fav->id()];
      }
    }
    if (in_array($bundle, $moderated, TRUE)) {
      $values['moderation_state'] = 'published';
    }
    $node = Node::create($values);
    $node->save();
    $n++;
    if ($def['translatable']) {
      foreach ($tr as $lang => $data) {
        $titem = $def['single'] ? ($data[$key] ?? NULL) : ($data[$key][$i] ?? NULL);
        if (!$titem) {
          continue;
        }
        smt_translate_paragraphs($model, $node, $def, $titem, $lang, $dir);
        $ttitle = $def['titleField'] ? ($titem[$def['titleField']] ?? $title) : $def['label'];
        $tv = ['title' => mb_substr((string) $ttitle, 0, 255), 'status' => 1] + smt_values($def, $titem, $dir, TRUE);
        if (in_array($bundle, $moderated, TRUE)) {
          $tv['moderation_state'] = 'published';
        }
        $tnode = $node->hasTranslation($lang) ? $node->getTranslation($lang) : $node->addTranslation($lang);
        foreach ($tv as $k => $v) {
          $tnode->set($k, $v);
        }
        $tnode->save();
        $t++;
      }
    }
  }
  echo "  $bundle : $n contenu(s) importé(s)" . ($t ? " (+ $t traductions)" : '') . "\n";
}
echo "Import terminé.\n";
