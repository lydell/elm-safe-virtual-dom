# Exit on failures.
set -e

###########################################################
# You need to edit this section!
#
# First you need to clone lydell’s forked packages somewhere.
# For example:
#
# mkdir -p ~/.elm/lydell
# cd ~/.elm/lydell
# git clone git@github.com:lydell/virtual-dom.git
# git clone git@github.com:lydell/browser.git
# git clone git@github.com:lydell/html.git
#
# Then update the code below.

# Set this to where you cloned lydell’s forked packages:
clone_dir=TODO
# clone_dir=~/.elm/lydell

# Put your usual command for running your project in this `run` function.
# It will be run with ELM_HOME set – see below.
# Examples:
# - npm start
# - elm make --output=build/main.js Main.elm
# - npx elm-pages dev
# Then, run `bash lydell.bash` instead of `npm start`, for example.
run() {
    echo 'command for starting your project not set.'
    echo 'Edit this bash script and try again.'
    exit 1
    # Example: You could replace the above 3 lines with:
    # npm start
}

# To uninstall:
# rm -rf ~/.elm/lydell elm-stuff
###########################################################

# Set ELM_HOME to a folder inside the local elm-stuff,
# in order not to mess up your global ~/.elm with potentially broken stuff.
elm_home_relative=elm-stuff/elm-home
mkdir -p "$elm_home_relative"
ELM_HOME="$(realpath "$elm_home_relative")"
export ELM_HOME

if test "$clone_dir" = TODO; then
    echo 'Directory for lydell’s forked packages not set.'
    echo 'Edit this bash script and try again.'
    exit 1
fi

# Patch the packages in the the local ELM_HOME.
for package_with_version in virtual-dom/1.0.4 browser/1.0.2 html/1.0.0; do
    package="$(dirname "$package_with_version")"
    dir="$ELM_HOME/0.19.1/packages/elm/$package_with_version"
    mkdir -p "$dir"
    rm -rf "$dir/src" "$dir/artifacts.dat" "$dir/artifacts.x.dat"
    cp "$clone_dir/$package/elm.json" "$dir/elm.json"
    cp -r "$clone_dir/$package/src" "$dir/src"
done

# Clear cache so that the patched stuff is used for sure.
rm -rf elm-stuff/0.19.1 elm-stuff/elm-pages
# If you have elm-stuff/ folders in more places you might want to remove all of them:
# find . -type d -path '*/elm-stuff/0.19.1' -exec rm -r {} +

# Run your usual startup command with ELM_HOME set.
run
