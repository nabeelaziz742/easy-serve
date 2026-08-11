
import os
import logging
import numpy as np
import pandas as pd
from django.conf import settings
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import linear_kernel


# ==================================================
# LOGGER
# ==================================================

logger = logging.getLogger(__name__)


# ==================================================
# PATHS
# ==================================================

ROOT_DIR = os.path.dirname(settings.BASE_DIR)

DATA_PATH = os.path.join(
    ROOT_DIR,
    "outputs",
    "cleaned_data"
)

MODEL_PATH = os.path.join(
    ROOT_DIR,
    "outputs",
    "models"
)


# ==================================================
# SAFE FILE LOADING
# ==================================================

def load_csv_file(file_path):

    try:

        if os.path.exists(file_path):

            return pd.read_csv(file_path)

        logger.warning(
            f"CSV file not found: {file_path}"
        )

        return pd.DataFrame()

    except Exception as error:

        logger.error(
            f"Error loading CSV file: {error}"
        )

        return pd.DataFrame()


def load_npy_file(file_path):

    try:

        if os.path.exists(file_path):

            return np.load(file_path)

        logger.warning(
            f"NPY file not found: {file_path}"
        )

        return np.array([])

    except Exception as error:

        logger.error(
            f"Error loading NPY file: {error}"
        )

        return np.array([])


# ==================================================
# LOAD DATASETS
# ==================================================

menu_items = load_csv_file(
    os.path.join(
        DATA_PATH,
        "menu_items_cleaned.csv"
    )
)

orders = load_csv_file(
    os.path.join(
        DATA_PATH,
        "orders_cleaned.csv"
    )
)

order_items = load_csv_file(
    os.path.join(
        DATA_PATH,
        "order_items_cleaned.csv"
    )
)

cosine_similarity_matrix = load_npy_file(
    os.path.join(
        MODEL_PATH,
        "cbf_similarity.npy"
    )
)


# ==================================================
# RECOMMEND SIMILAR MENU ITEMS
# ==================================================

def recommend_menu_item(
    item_id: int,
    top_n: int = 5
):

    """
    Recommend similar menu items
    using cosine similarity matrix.

    Returns:
        list[int]
    """

    if (
        menu_items.empty
        or cosine_similarity_matrix.size == 0
    ):

        return []

    try:

        similarity_scores = list(
            enumerate(
                cosine_similarity_matrix[item_id]
            )
        )

    except Exception as error:

        logger.error(
            f"Recommendation error: {error}"
        )

        return []

    similarity_scores = sorted(
        similarity_scores,
        key=lambda x: x[1],
        reverse=True
    )

    similarity_scores = similarity_scores[
        1: top_n + 1
    ]

    recommended_indices = [
        item[0]
        for item in similarity_scores
    ]

    recommended_ids = menu_items.iloc[
        recommended_indices
    ]["id"].tolist()

    return recommended_ids


# ==================================================
# CONTENT BASED RECOMMENDATION
# ==================================================

def get_content_based_recommendations(
    user_id,
    top_n: int = 5
):

    """
    Recommend menu items
    based on user order history.

    Returns:
        list[int]
    """

    if (
        menu_items.empty
        or orders.empty
        or order_items.empty
    ):

        return []

    try:

        # ==========================================
        # USER ORDERS
        # ==========================================

        user_orders = orders[
            orders["user_id"] == user_id
        ]

        if user_orders.empty:

            return []

        # ==========================================
        # USER ORDER ITEMS
        # ==========================================

        user_order_items = order_items[
            order_items["order_id"].isin(
                user_orders["id"]
            )
        ]

        if user_order_items.empty:

            return []

        # ==========================================
        # USER ORDERED MENU ITEMS
        # ==========================================

        ordered_menu_item_ids = (
            user_order_items[
                "menu_item_id"
            ].unique()
        )

        user_menu_items = menu_items[
            menu_items["id"].isin(
                ordered_menu_item_ids
            )
        ]

        if user_menu_items.empty:

            return []

        # ==========================================
        # USER PROFILE
        # ==========================================

        user_profile = " ".join(
            user_menu_items["name"]
            .astype(str)
            .tolist()
        )

        # ==========================================
        # CORPUS
        # ==========================================

        corpus = (
            menu_items["name"]
            .astype(str)
            .tolist()
        )

        corpus.append(user_profile)

        # ==========================================
        # TF-IDF
        # ==========================================

        vectorizer = TfidfVectorizer(
            stop_words="english"
        )

        tfidf_matrix = vectorizer.fit_transform(
            corpus
        )

        # ==========================================
        # COSINE SIMILARITY
        # ==========================================

        similarity_scores = linear_kernel(
            tfidf_matrix[-1],
            tfidf_matrix[:-1]
        ).flatten()

        ranked_indices = (
            similarity_scores.argsort()[::-1]
        )

        menu_item_ids = (
            menu_items["id"].tolist()
        )

        recommendations = []

        # ==========================================
        # BUILD RECOMMENDATIONS
        # ==========================================

        for index in ranked_indices:

            item_id = menu_item_ids[index]

            if item_id not in ordered_menu_item_ids:

                recommendations.append(
                    item_id
                )

            if len(recommendations) >= top_n:

                break

        return recommendations

    except Exception as error:

        logger.error(
            f"Content recommendation error: {error}"
        )

        return []

