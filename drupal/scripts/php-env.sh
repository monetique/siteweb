# À charger avec « . scripts/php-env.sh » : place PHP 8.3 (version de production, Ubuntu 24.04)
# en tête du PATH s'il est installé via Homebrew (brew install php@8.3), sinon garde le PHP du système.
for dir in /opt/homebrew/opt/php@8.3/bin /usr/local/opt/php@8.3/bin; do
  if [ -x "$dir/php" ]; then
    PATH="$dir:$PATH"
    export PATH
    break
  fi
done

case "$(php -r 'echo PHP_MAJOR_VERSION.".".PHP_MINOR_VERSION;' 2>/dev/null)" in
  8.3) ;;
  *) echo "Attention : PHP 8.3 recommandé (production). Installez-le avec : brew install php@8.3" >&2 ;;
esac
