set -e
pip install flask flask-cors flask-jwt-extended flask-sqlalchemy numpy scikit-learn

if [ -f "package.json" ]; then
  npm install
fi
